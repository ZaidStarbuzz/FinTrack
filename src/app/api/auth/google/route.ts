import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { signToken } from "@/lib/server/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(req: Request) {
  const { credential } = await req.json();
  if (!credential)
    return NextResponse.json({ error: "Missing credential" }, { status: 400 });

  // Verify id_token with Google
  const verify = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
  );
  if (!verify.ok)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const payload = await verify.json();
  const email = payload.email;
  const full_name = payload.name;

  // find or create user
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

  const token = signToken({ sub: user.id, email: user.email });
  const cookie = `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; ${process.env.NODE_ENV === "production" ? "Secure" : ""}`;

  return new Response(
    JSON.stringify({
      user: { id: user.id, email: user.email, full_name: user.full_name },
    }),
    {
      status: 200,
      headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
    },
  );
}
