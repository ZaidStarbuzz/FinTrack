import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { signToken } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }

  const { id_token } = await tokenRes.json();

  // Verify id_token with Google
  const verify = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`,
  );
  if (!verify.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }

  const payload = await verify.json();
  const email: string = payload.email;
  const full_name: string = payload.name;

  // Find or create user
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    const { data } = await supabase
      .from("users")
      .insert({ email, full_name })
      .select()
      .single();
    user = data;
  }

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }

  const token = signToken({ sub: user.id, email: user.email });
  const cookie = `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; ${process.env.NODE_ENV === "production" ? "Secure" : ""}`;

  return NextResponse.redirect(`${appUrl}/dashboard`, {
    headers: { "Set-Cookie": cookie },
  });
}
