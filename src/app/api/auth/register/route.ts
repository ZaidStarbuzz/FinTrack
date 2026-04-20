import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { hashPassword, signToken, sendEmail } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name } = body;
    if (!email || !password)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const hashed = hashPassword(password);
    const { data, error } = await supabase
      .from("users")
      .insert({ email, password: hashed, full_name })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Sign session token
    const token = signToken({ sub: data.id, email: data.email });
    const cookie = `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; ${process.env.NODE_ENV === "production" ? "Secure" : ""}`;

    // send improved welcome email (best effort)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const supportEmail =
        process.env.SUPPORT_EMAIL ||
        process.env.GMAIL_USER ||
        "support@fintrack.app";

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #0f172a;">
          <div style="max-width:680px;margin:0 auto;padding:24px;">
            <header style="text-align:center;padding:12px 0 24px;">
              <h1 style="margin:0;font-size:20px;color:#111827">FinTrack</h1>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Personal finance, simplified</p>
            </header>

            <main style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e6e9ef;">
              <h2 style="margin-top:0;font-size:18px;color:#0f172a">Welcome${full_name ? `, ${full_name}` : ""} 👋</h2>
              <p style="color:#374151;line-height:1.5">Thanks for creating a FinTrack account — we’re excited to help you take control of your finances. Your account is ready and you can sign in using the button below.</p>

              <p style="text-align:center;margin:22px 0 18px;">
                <a href="${appUrl}/login" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">Sign in to FinTrack</a>
              </p>

              <p style="color:#374151;line-height:1.5">A few tips to get started:</p>
              <ul style="color:#374151;line-height:1.6">
                <li>Add your primary accounts (bank, credit cards) to see your net worth.</li>
                <li>Create categories and start tracking transactions — FinTrack will summarize spending automatically.</li>
                <li>Set a budget or a savings goal and let us notify you when you're close to limits.</li>
              </ul>

              <p style="color:#374151;line-height:1.5">If you didn’t create this account or need help, reply to this email or contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
            </main>

            <footer style="text-align:center;color:#9ca3af;font-size:13px;margin-top:18px">
              <p style="margin:0">FinTrack · <a href="${appUrl}" style="color:#9ca3af;text-decoration:underline">${appUrl.replace(/^https?:\/\//, "")}</a></p>
            </footer>
          </div>
        </div>`;

      await sendEmail(
        data.email,
        "Welcome to FinTrack — your account is ready",
        html,
      );
    } catch (e) {
      console.warn("Failed to send welcome email", e);
    }

    return new Response(
      JSON.stringify({
        user: { id: data.id, email: data.email, full_name: data.full_name },
      }),
      {
        status: 200,
        headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Register error:", err);
    // Return JSON error instead of letting Next render HTML error page
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 },
    );
  }
}
