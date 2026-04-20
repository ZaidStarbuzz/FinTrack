import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, hashPassword } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password)
    return NextResponse.json({ error: "Missing" }, { status: 400 });
  const payload: any = verifyToken(token);
  if (!payload || payload.type !== "reset")
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const hashed = hashPassword(password);
  const { error } = await supabase
    .from("users")
    .update({ password: hashed })
    .eq("id", payload.sub);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
