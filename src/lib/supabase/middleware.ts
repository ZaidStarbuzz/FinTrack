import { NextResponse, type NextRequest } from "next/server";

function parseCookie(cookieHeader = "") {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const obj: Record<string, string> = {};
  parts.forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) obj[k] = v;
  });
  return obj;
}

// NOTE: Middleware runs in the Edge runtime. Avoid importing Node-only modules here.
// We only check for the presence of a session cookie for routing purposes. The
// actual token verification and profile lookup happen inside Nodejs API routes.
export async function updateSession(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookie(cookieHeader);
  const token = cookies["token"];

  // Allow API routes to proceed without redirecting — API clients expect JSON, not HTML redirects
  if (request.nextUrl.pathname.startsWith("/api"))
    return NextResponse.next({ request });

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  // If there's no token and the user isn't on an auth page, redirect to login
  if (!token && !isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If there's a token and user is on auth page, redirect to dashboard. We don't
  // verify token here (Edge runtime restrictions). This keeps UX smooth; server
  // APIs still enforce auth.
  if (token && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
