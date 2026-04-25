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

  // Account last 4 digits
  // Handles: XX324 (ICICI 3-digit), XX8212 (IndusInd 4-digit), *XX8212, A/C *XX8212
  // Also handles Acct XX324 where last 3 digits are used (pad to match stored last4)
  let accountLast4: string | null = null;
  const acctPatterns = [
    // A/C *XX8212 or A/C XX8212
    /(?:a\/c|ac|acct|account|card)\s*\*?(?:XX+|xx+|x{1,}|\*{1,})\s*([0-9]{3,4})\b/i,
    // standalone XX324 or XX8212 or *XX8212
    /\*?(?:XX|xx)([0-9]{3,4})\b/,
    // 4-digit preceded by debited/credited keyword
    /\b([0-9]{4})\b(?=\s*(?:is\s+)?(?:debited|credited))/i,
  ];
  for (const pattern of acctPatterns) {
    const m = text.match(pattern);
    if (m) {
      // Pad 3-digit to 4-digit with leading 0 to match stored last4 "0324"
      accountLast4 = m[1].length === 3 ? "0" + m[1] : m[1];
      break;
    }
  }

  // Reference number — UPI / RRN / UTR / IMPS / NEFT / Ref
  const refMatch = text.match(
    /(?:rrn|ref(?:erence)?(?:\s*no\.?|num)?|txn\s*(?:id|no)?|utr|imps|neft|upi)[:\s#]*([0-9]{6,25})/i,
  );
  const refNumber = refMatch ? refMatch[1] : null;

  // Available balance
  const balMatch = text.match(
    /(?:avl\.?\s*bal(?:ance)?|available\s*bal(?:ance)?|bal)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  );
  const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, "")) : null;

  // Transaction type
  const lc = text.toLowerCase();
  let type: ParsedSMS["type"] = null;
  if (/debited|debit\s+by|withdrawn|payment\s+of|paid\s+to|spent|purchase|pos\s|emi\s|transferred\s+to|sent\s+to/i.test(lc))
    type = "expense";
  else if (/credited|credit\s+by|received|deposited|refund|cashback|salary|transferred\s+from|received\s+from/i.test(lc))
    type = "income";

  // Merchant extraction — prioritise "from NAME" for credits, "towards NAME" / "; NAME credited" for debits
  let merchant: string | null = null;

  // ICICI debit pattern: "; NAME credited." — e.g. "RAJ KUMBAJI credited"
  const iciciDebitMerchant = text.match(/;\s*([A-Z][A-Za-z\s]{2,40}?)\s+credited/);
  if (iciciDebitMerchant) {
    merchant = iciciDebitMerchant[1].trim();
  }

  // ICICI credit pattern: "from NAME. UPI" — e.g. "from RAJ KUMBAJI."
  if (!merchant) {
    const iciciCreditMerchant = text.match(/from\s+([A-Z][A-Za-z\s]{2,40}?)(?:\.\s*UPI|\s+UPI|\.)/);
    if (iciciCreditMerchant) merchant = iciciCreditMerchant[1].trim();
  }

  // IndusInd / generic: "towards NAME" or "to NAME"
  if (!merchant) {
    const towardsMerchant = text.match(/(?:towards|to)\s+([A-Za-z0-9@._\-]{3,50}?)(?:\s*\.|,|\s+RRN|\s+Ref|\s+on\s|$)/i);
    if (towardsMerchant) merchant = towardsMerchant[1].trim();
  }

  // Generic fallback: "at NAME" / "from NAME"
  if (!merchant) {
    const genericMerchant = text.match(/(?:at|from)\s+([A-Za-z0-9&'.\-\s]{2,40}?)(?:\s+on\s|\s+for\s|\s+via\s|\s+ref|\s+UPI|\.)/i);
    if (genericMerchant) merchant = genericMerchant[1].trim();
  }

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
