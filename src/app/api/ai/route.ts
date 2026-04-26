import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/server/auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function parseCookie(h = "") {
  const obj: Record<string, string> = {};
  h.split(";").forEach((p) => {
    const [k, ...v] = p.trim().split("=");
    if (k) obj[k] = v.join("=");
  });
  return obj;
}

async function gatherFinancialContext(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOf3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
  const startOf6Months = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

  const [
    { data: accounts },
    { data: txn3m },
    { data: budgets },
    { data: goals },
    { data: loans },
    { data: chitFunds },
    { data: assets },
    { data: categories },
    { data: txnThisMonth },
  ] = await Promise.all([
    supabase.from("accounts").select("name,type,balance,currency,credit_limit,is_default,account_number_last4").eq("user_id", userId).neq("status", "closed"),
    supabase.from("transactions").select("type,amount,date,merchant,description,category_id,tags").eq("user_id", userId).gte("date", startOf3Months).neq("status", "void").order("date", { ascending: false }).limit(200),
    supabase.from("budgets").select("name,amount,period,is_active,category_id").eq("user_id", userId).eq("is_active", true),
    supabase.from("goals").select("name,target_amount,current_amount,target_date,status,monthly_contribution,priority").eq("user_id", userId).neq("status", "cancelled"),
    supabase.from("loans").select("name,type,principal_amount,outstanding_balance,interest_rate,emi_amount,emi_due_day,status,tenure_months").eq("user_id", userId).eq("status", "active"),
    supabase.from("chit_funds").select("name,total_amount,monthly_contribution,duration_months,start_date,payout_month,payout_amount,status").eq("user_id", userId).eq("status", "active"),
    supabase.from("assets").select("name,type,current_value,purchase_value,purchase_date,is_liquid").eq("user_id", userId),
    supabase.from("categories").select("id,name,type").or(`user_id.eq.${userId},user_id.is.null`),
    supabase.from("transactions").select("type,amount,merchant,category_id").eq("user_id", userId).gte("date", startOfMonth).neq("status", "void"),
  ]);

  // Build category map for readable names
  const catMap = new Map((categories || []).map((c: any) => [c.id, c.name]));

  // Aggregate 3-month spending by category
  const catSpend: Record<string, number> = {};
  const catIncome: Record<string, number> = {};
  let totalIncome3m = 0, totalExpense3m = 0;
  (txn3m || []).forEach((t: any) => {
    const cat = catMap.get(t.category_id) || "Uncategorized";
    if (t.type === "expense") {
      catSpend[cat] = (catSpend[cat] || 0) + Number(t.amount);
      totalExpense3m += Number(t.amount);
    } else if (t.type === "income") {
      catIncome[cat] = (catIncome[cat] || 0) + Number(t.amount);
      totalIncome3m += Number(t.amount);
    }
  });

  // Monthly breakdown for current month
  let thisMonthIncome = 0, thisMonthExpense = 0;
  const thisMonthByCategory: Record<string, number> = {};
  (txnThisMonth || []).forEach((t: any) => {
    const cat = catMap.get(t.category_id) || "Uncategorized";
    if (t.type === "expense") {
      thisMonthExpense += Number(t.amount);
      thisMonthByCategory[cat] = (thisMonthByCategory[cat] || 0) + Number(t.amount);
    } else if (t.type === "income") {
      thisMonthIncome += Number(t.amount);
    }
  });

  // Top merchants
  const merchantSpend: Record<string, number> = {};
  (txn3m || []).filter((t: any) => t.type === "expense" && t.merchant).forEach((t: any) => {
    merchantSpend[t.merchant] = (merchantSpend[t.merchant] || 0) + Number(t.amount);
  });
  const topMerchants = Object.entries(merchantSpend).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Net worth calc
  const totalAssets = (assets || []).reduce((s: number, a: any) => s + Number(a.current_value), 0)
    + (accounts || []).filter((a: any) => Number(a.balance) > 0).reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalLiabilities = (loans || []).reduce((s: number, l: any) => s + Number(l.outstanding_balance || 0), 0)
    + (accounts || []).filter((a: any) => Number(a.balance) < 0).reduce((s: number, a: any) => s + Math.abs(Number(a.balance)), 0);

  const avgMonthlyIncome = totalIncome3m / 3;
  const avgMonthlyExpense = totalExpense3m / 3;
  const savingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome * 100).toFixed(1) : "0";

  return {
    summary: {
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyExpense: Math.round(avgMonthlyExpense),
      savingsRate,
      thisMonthIncome: Math.round(thisMonthIncome),
      thisMonthExpense: Math.round(thisMonthExpense),
      netWorth: Math.round(totalAssets - totalLiabilities),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
    },
    accounts: (accounts || []).map((a: any) => ({
      name: a.name, type: a.type,
      balance: Math.round(Number(a.balance)),
      creditLimit: a.credit_limit ? Math.round(Number(a.credit_limit)) : null,
    })),
    topSpendingCategories: Object.entries(catSpend)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([cat, amt]) => ({ category: cat, amount: Math.round(amt), pct: totalExpense3m > 0 ? ((amt / totalExpense3m) * 100).toFixed(1) : "0" })),
    thisMonthByCategory: Object.entries(thisMonthByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ category: cat, amount: Math.round(amt) })),
    topMerchants: topMerchants.map(([m, amt]) => ({ merchant: m, amount: Math.round(amt) })),
    budgets: (budgets || []).map((b: any) => ({ name: b.name, limit: Math.round(Number(b.amount)), period: b.period })),
    goals: (goals || []).map((g: any) => ({
      name: g.name,
      target: Math.round(Number(g.target_amount)),
      saved: Math.round(Number(g.current_amount)),
      pct: g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(0) : "0",
      targetDate: g.target_date,
      monthlyContribution: g.monthly_contribution ? Math.round(Number(g.monthly_contribution)) : null,
      status: g.status,
    })),
    loans: (loans || []).map((l: any) => ({
      name: l.name, type: l.type,
      outstanding: Math.round(Number(l.outstanding_balance || l.principal_amount)),
      emi: Math.round(Number(l.emi_amount)),
      rate: l.interest_rate,
    })),
    chitFunds: (chitFunds || []).map((c: any) => ({
      name: c.name,
      monthlyContribution: Math.round(Number(c.monthly_contribution)),
      totalAmount: Math.round(Number(c.total_amount)),
      payoutMonth: c.payout_month,
      durationMonths: c.duration_months,
    })),
    assets: (assets || []).map((a: any) => ({
      name: a.name, type: a.type,
      value: Math.round(Number(a.current_value)),
      purchaseValue: a.purchase_value ? Math.round(Number(a.purchase_value)) : null,
      isLiquid: a.is_liquid,
    })),
  };
}

export async function POST(req: NextRequest) {
  const cookies = parseCookie(req.headers.get("cookie") || "");
  const payload: any = verifyToken(cookies["token"] || "");
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mode } = await req.json().catch(() => ({ mode: "full" }));

  const ctx = await gatherFinancialContext(payload.sub);

  const systemPrompt = `You are FinTrack AI — a world-class personal finance advisor for Indian users. You have real-time access to the user's complete financial picture. Be direct, specific, and proactive. Use Indian financial context (INR, SIP, PPF, FD, chit funds, UPI, etc.).

Always structure your response with clear sections using these exact headers (use ## for headers):
## 💰 Financial Health Score
## 📊 Spending Analysis & Where to Cut
## 🎯 Goals Strategy
## 💡 Investment Recommendations
## ⚠️ Risk Alerts
## 📅 30-Day Action Plan

Be VERY specific — use actual numbers from their data. Don't be vague. Give exact rupee amounts, percentages, and timelines. If something looks bad, say so directly. If something is good, celebrate it.`;

  const userMessage = `Here is my complete financial data as of today:

${JSON.stringify(ctx, null, 2)}

Please give me a comprehensive, proactive, next-level financial analysis. Be brutally honest. Tell me:
1. My financial health score (0-100) with explanation
2. Exactly where I'm wasting money and by how much
3. Which goals I'll miss and how to fix them
4. Where I should invest my savings (SIP, PPF, FD, etc.) with specific allocations
5. Any financial risks I should know about immediately
6. A specific 30-day action plan with daily/weekly tasks

Use the actual numbers from my data throughout. Be like a sharp CFO, not a generic chatbot.`;

  // Stream the response
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
