import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// ─── SMS Parser ─────────────────────────────────────────────────────────────

interface ParsedSMS {
  type: "expense" | "income" | null;
  amount: number | null;
  merchant: string | null;
  accountLast4: string | null;
  balance: number | null;
  refNumber: string | null;
}

function parseSMS(text: string): ParsedSMS {
  text = text.replace(/\n/g, " ").trim();

  // Amount — Rs.1,234.56 | INR 1234 | ₹1,234.56
  const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;

  // Account last 4 digits
  const acctMatch =
    text.match(/(?:a\/c|ac|account|card|A\/C)\s*(?:no\.?|ending|XX+|x+|\*+)?\.?\s*([0-9]{4})\b/i) ||
    text.match(/\b(?:XX|xx|\*{2,})([0-9]{4})\b/);
  const accountLast4 = acctMatch ? acctMatch[1] : null;

  // Reference number
  const refMatch = text.match(
    /(?:ref(?:erence)?(?:\s*no\.?)?|txn\s*(?:id)?|utr|imps ref|neft ref)[:\s#]*([A-Z0-9]{6,20})/i,
  );
  const refNumber = refMatch ? refMatch[1] : null;

  // Available balance
  const balMatch = text.match(
    /(?:avl\.?\s*bal(?:ance)?|available balance|bal)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  );
  const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null;

  // Transaction type
  const lc = text.toLowerCase();
  let type: ParsedSMS["type"] = null;
  if (
    /debited|debit|withdrawn|payment of|paid to|spent|purchase|pos |emi |transferred to|sent to/i.test(lc)
  )
    type = "expense";
  else if (
    /credited|credit|received|deposited|refund|cashback|salary|transferred from|received from/i.test(lc)
  )
    type = "income";

  // Merchant
  const merchantMatch = text.match(
    /(?:at|to|from)\s+([A-Za-z0-9&'\-\s]{3,40}?)(?:\s+on|\s+for|\s+via|\s+ref|\s+UPI|\s+using|\.|,|$)/i,
  );
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  return { type, amount, merchant, accountLast4, balance, refNumber };
}

// ─── Category guesser ────────────────────────────────────────────────────────

function guessCategoryName(merchant: string | null, text: string): string | null {
  const t = `${merchant || ""} ${text}`.toLowerCase();
  if (/zomato|swiggy|food|restaurant|cafe|pizza|burger|kfc|mcdonald/i.test(t)) return "food";
  if (/amazon|flipkart|myntra|shopping|mall|mart|store/i.test(t)) return "shopping";
  if (/uber|ola|rapido|metro|railway|irctc|petrol|fuel|toll/i.test(t)) return "transport";
  if (/electricity|bsnl|jio|airtel|broadband|utility|bill/i.test(t)) return "bills";
  if (/salary|payroll/i.test(t)) return "salary";
  if (/emi|loan repay/i.test(t)) return "loan";
  if (/netflix|spotify|prime|hotstar|subscription/i.test(t)) return "entertainment";
  if (/medical|pharmacy|hospital|doctor|apollo|health/i.test(t)) return "health";
  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: token in query param ?token=xxx  (easy for iPhone Shortcuts to embed in URL)
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  // Resolve user from token
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("sms_token", token)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userId = user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const smsText: string = body.message || body.body || body.sms || body.text || "";
  const sender: string = body.sender || body.from || "";

  if (!smsText) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const parsed = parseSMS(smsText);

  if (!parsed.type || !parsed.amount) {
    return NextResponse.json({ ok: true, skipped: "not a bank transaction SMS" });
  }

  // Dedup
  const importHash = crypto
    .createHash("sha256")
    .update(`${sender}:${smsText}`)
    .digest("hex");

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("import_hash", importHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: "duplicate", id: existing.id });
  }

  // Match account by last4
  let accountId: string | null = null;
  if (parsed.accountLast4) {
    const { data: acc } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("account_number_last4", parsed.accountLast4)
      .maybeSingle();
    accountId = acc?.id ?? null;
  }

  // Fall back to default account
  if (!accountId) {
    const { data: def } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
    accountId = def?.id ?? null;
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "No matching account. Set account_number_last4 on your accounts in FinTrack." },
      { status: 422 },
    );
  }

  // Category
  let categoryId: string | null = null;
  const catName = guessCategoryName(parsed.merchant, smsText);
  if (catName) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .ilike("name", `%${catName}%`)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  const { data: txn, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: accountId,
      type: parsed.type,
      amount: parsed.amount,
      merchant: parsed.merchant,
      description: `SMS: ${smsText.slice(0, 120)}`,
      reference_number: parsed.refNumber,
      category_id: categoryId,
      date: new Date().toISOString(),
      status: "completed",
      import_hash: importHash,
      tags: ["sms-auto"],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, transaction: txn });
}
