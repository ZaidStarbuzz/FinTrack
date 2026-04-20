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

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookie(cookieHeader);
    const token = cookies["token"];
    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload: any = verifyToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const input = { ...body, user_id: payload.sub };

    const { data, error } = await supabase
      .from("transactions")
      .insert(input)
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data });
  } catch (e: any) {
    console.error("Create transaction error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookie(cookieHeader);
    const token = cookies["token"];
    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const payload: any = verifyToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabase
      .from("transactions")
      .update(body)
      .match({ id, user_id: payload.sub })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data });
  } catch (e: any) {
    console.error("Update transaction error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookie(cookieHeader);
    const token = cookies["token"];
    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const payload: any = verifyToken(token);
    if (!payload)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
      .from("transactions")
      .delete()
      .match({ id, user_id: payload.sub });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Delete transaction error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
