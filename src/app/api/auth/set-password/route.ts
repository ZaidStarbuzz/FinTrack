import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { hashPassword, verifyToken } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function parseCookie(cookieHeader = "") {
  const obj: Record<string, string> = {};
  cookieHeader.split(";").forEach((p) => {
    const [k, v] = p.trim().split("=");
    if (k && v) obj[k] = v;
  });
  return obj;
}

export async function POST(req: Request) {
  const cookies = parseCookie(req.headers.get("cookie") || "");
  const payload: any = verifyToken(cookies["token"] || "");
  if (!payload)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password || password.length < 8)
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );

  // Only allow if user has no password yet (Google-only account)
  const { data: user } = await supabase
    .from("users")
    .select("password")
    .eq("id", payload.sub)
    .maybeSingle();

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.password)
    return NextResponse.json(
      { error: "Password already set. Use change password instead." },
      { status: 400 },
    );

  const { error } = await supabase
    .from("users")
    .update({ password: hashPassword(password) })
    .eq("id", payload.sub);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
