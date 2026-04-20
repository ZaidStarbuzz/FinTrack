import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function parseCookie(cookieHeader = "") {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const obj: Record<string, string> = {};
  parts.forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) obj[k] = v;
  });
  return obj;
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parseCookie(cookieHeader);
  const token = cookies["token"];
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  const payload: any = verifyToken(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 200 });

  const { data: user, error } = await supabase
    .from("users")
    .select("id,email,full_name")
    .eq("id", payload.sub)
    .maybeSingle();
  if (error || !user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json(user);
}
