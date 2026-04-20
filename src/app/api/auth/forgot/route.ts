import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { signToken, sendEmail } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { data: user } = await supabase
    .from("users")
    .select("id,email,full_name")
    .eq("email", email)
    .maybeSingle();
  if (!user) return NextResponse.json({ ok: true });

  const token = signToken({ sub: user.id, type: "reset" });
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  try {
    await sendEmail(
      user.email,
      "Reset your password",
      `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
    );
  } catch (e) {}

  return NextResponse.json({ ok: true });
}
