import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// ─── SMS Parser ──────────────────────────────────────────────────────────────

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

  // Account last 4 digits — XX1234 / x1234 / *1234 / A/c 1234 / ac no 1234
  const acctMatch =
    text.match(/(?:a\/c|ac|account|card|A\/C)\s*(?:no\.?|ending|XX+|x+|\*+)?\.?\s*([0-9]{4})\b/i) ||
    text.match(/\b(?:XX|xx|x{2,}|\*{2,})([0-9]{4})\b/) ||
    text.match(/\b([0-9]{4})\b(?=\s*(?:is|has|was|debited|credited))/i);
  const accountLast4 = acctMatch ? acctMatch[1] : null;

  // Reference / UPI / UTR number
  const refMatch = text.match(
    /(?:ref(?:erence)?(?:\s*no\.?|num)?|txn\s*(?:id|no)?|utr|imps|neft|upi\s*ref)[:\s#]*([A-Z0-9]{6,25})/i,
  );
  const refNumber = refMatch ? refMatch[1] : null;

  // Available balance
  const balMatch = text.match(
    /(?:avl\.?\s*bal(?:ance)?|available\s*bal(?:ance)?|bal\.?)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  );
  const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null;

  // Transaction type
  const lc = text.toLowerCase();
  let type: ParsedSMS["type"] = null;
  if (/debited|debit|withdrawn|payment\s+of|paid\s+to|spent|purchase|pos\s|emi\s|transferred\s+to|sent\s+to/i.test(lc))
    type = "expense";
  else if (/credited|credit|received|deposited|refund|cashback|salary|transferred\s+from|received\s+from/i.test(lc))
    type = "income";

  // Merchant — appears after "at", "to", "from", "towards"
  const merchantMatch = text.match(
    /(?:at|to|from|towards)\s+([A-Za-z0-9&'.\-\s]{2,40}?)(?:\s+on\s|\s+for\s|\s+via\s|\s+ref|\s+UPI|\s+using|\s+through|\.|,|$)/i,
  );
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  return { type, amount, merchant, accountLast4, balance, refNumber };
}

// ─── Category guesser ────────────────────────────────────────────────────────

function guessCategoryName(merchant: string | null, text: string): string | null {
  const t = `${merchant || ""} ${text}`.toLowerCase();
  if (/zomato|swiggy|food|restaurant|cafe|pizza|burger|kfc|mcdonald|blinkit|dunzo/i.test(t)) return "food";
  if (/amazon|flipkart|myntra|shopping|mall|mart|store|meesho|nykaa/i.test(t)) return "shopping";
  if (/uber|ola|rapido|metro|railway|irctc|petrol|fuel|toll|bus|cab/i.test(t)) return "transport";
  if (/electricity|bsnl|jio|airtel|broadband|utility|bill|recharge|vi\b|vodafone/i.test(t)) return "bills";
  if (/salary|payroll/i.test(t)) return "salary";
  if (/emi|loan repay/i.test(t)) return "loan";
  if (/netflix|spotify|prime|hotstar|subscription|zee5/i.test(t)) return "entertainment";
  if (/medical|pharmacy|hospital|doctor|apollo|health|medplus/i.test(t)) return "health";
  return null;
}

// ─── Health check + debug ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: true, status: "webhook is live. provide ?token= to verify auth." });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("sms_token", token)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  // Check default account exists
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, account_number_last4, is_default")
    .eq("user_id", user.id)
    .neq("status", "closed");

  // Recent SMS transactions
  const { data: recent } = await supabase
    .from("transactions")
    .select("id, amount, type, merchant, description, date, created_at, tags")
    .eq("user_id", user.id)
    .contains("tags", ["sms-auto"])
    .order("created_at", { ascending: false })
    .limit(10);

  const hasDefault = accounts?.some((a) => a.is_default);
  const hasLast4 = accounts?.some((a) => a.account_number_last4);

  return NextResponse.json({
    ok: true,
    authenticated_as: user.email,
    accounts_check: {
      total_accounts: accounts?.length ?? 0,
      has_default_account: hasDefault,
      has_any_last4_set: hasLast4,
      accounts: accounts?.map((a) => ({
        name: a.name,
        last4: a.account_number_last4 ?? "NOT SET",
        is_default: a.is_default,
      })),
    },
    recent_sms_transactions: recent ?? [],
    message: recent?.length
      ? `Webhook working. ${recent.length} SMS transaction(s) received.`
      : "Webhook live and authenticated, but no SMS transactions yet.",
  });
}

// ─── POST — receive SMS from iPhone Shortcuts ────────────────────────────────

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const debug = searchParams.get("debug") === "1";

  if (!token) {
    return NextResponse.json({ error: "Missing ?token= in URL" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("sms_token", token)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userId = user.id;

  // Accept both JSON and plain text body (Shortcuts can send either)
  let smsText = "";
  let sender = "";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    smsText = body.message || body.body || body.sms || body.text || "";
    sender = body.sender || body.from || "";
  } else {
    // plain text body — Shortcuts sometimes sends raw text
    smsText = await req.text();
    sender = req.headers.get("x-sender") || "";
  }

  if (!smsText) {
    return NextResponse.json({ error: "Empty message body", received_content_type: contentType }, { status: 400 });
  }

  const parsed = parseSMS(smsText);

  if (debug) {
    // Debug mode: return parse result without inserting
    return NextResponse.json({ debug: true, smsText, parsed });
  }

  if (!parsed.type || !parsed.amount) {
    return NextResponse.json({
      ok: true,
      skipped: "could not detect transaction type or amount",
      parsed,
      tip: "Append ?debug=1 to your webhook URL to see how the SMS is being parsed",
    });
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
    return NextResponse.json({
      error: "No account found",
      detail: "Either set account_number_last4 on an account, or mark one account as default in FinTrack.",
      parsed_last4: parsed.accountLast4,
    }, { status: 422 });
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

  if (error) {
    return NextResponse.json({ error: error.message, detail: error.details }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transaction: txn });
}
