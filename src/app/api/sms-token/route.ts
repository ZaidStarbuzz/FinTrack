import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/server/auth";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function parseCookie(cookieHeader = "") {
  const obj: Record<string, string> = {};
  cookieHeader.split(";").forEach((p) => {
    const [k, ...rest] = p.trim().split("=");
    if (k) obj[k] = rest.join("=");
  });
  return obj;
}

function getUser(req: NextRequest) {
  const cookies = parseCookie(req.headers.get("cookie") || "");
  return verifyToken(cookies["token"] || "") as any;
}

// GET — return current token (null if not generated yet)
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("users")
    .select("sms_token")
    .eq("id", payload.sub)
    .maybeSingle();

  return NextResponse.json({ token: data?.sms_token ?? null });
}

// POST — generate (or regenerate) a token
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = crypto.randomBytes(32).toString("hex");

  const { error } = await supabase
    .from("users")
    .update({ sms_token: token })
    .eq("id", payload.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token });
}
