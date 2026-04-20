import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function parseCookie(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .reduce((acc: Record<string, string>, p) => {
      const [k, v] = p.split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookie(cookieHeader);
    const token = cookies["token"];
    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload: any = verifyToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,message,action_url,is_read,created_at")
      .eq("user_id", payload.sub)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ notifications: data });
  } catch (e: any) {
    console.error("Notifications GET error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
