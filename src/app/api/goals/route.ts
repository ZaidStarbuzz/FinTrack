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

/**
 * GET
 */
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
            .from("goals")
            .select("*")
            .eq("user_id", payload.sub)
            .order("priority")
            .order("name");

        if (error)
            return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ goals: data });
    } catch (e: any) {
        console.error("Fetch goals error", e);
        return NextResponse.json(
            { error: e?.message || "Server error" },
            { status: 500 },
        );
    }
}

/**
 * CREATE
 */
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

        const { data, error } = await supabase
            .from("goals")
            .insert({ ...body, user_id: payload.sub })
            .select()
            .single();

        if (error)
            return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ goal: data });
    } catch (e: any) {
        console.error("Create goal error", e);
        return NextResponse.json(
            { error: e?.message || "Server error" },
            { status: 500 },
        );
    }
}

/**
 * UPDATE
 */
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
        const { id, ...updates } = body;

        if (!id)
            return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const { data, error } = await supabase
            .from("goals")
            .update(updates)
            .match({ id, user_id: payload.sub })
            .select()
            .single();

        if (error)
            return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ goal: data });
    } catch (e: any) {
        console.error("Update goal error", e);
        return NextResponse.json(
            { error: e?.message || "Server error" },
            { status: 500 },
        );
    }
}

/**
 * DELETE (optional but recommended)
 */
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
        const { id } = body;

        if (!id)
            return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const { error } = await supabase
            .from("goals")
            .delete()
            .match({ id, user_id: payload.sub });

        if (error)
            return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Delete goal error", e);
        return NextResponse.json(
            { error: e?.message || "Server error" },
            { status: 500 },
        );
    }
}