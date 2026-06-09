import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

const PUBLIC = ["/login", "/api/auth/", "/api/init", "/api/seed"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (pathname === "/login" && token) {
    const user = await verifySessionToken(token);
    if (user) return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPublic) return NextResponse.next();

  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await verifySessionToken(token);
  if (!user) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-user-id", user.id);
  res.headers.set("x-user-email", user.email);
  res.headers.set("x-user-name", user.name);
  res.headers.set("x-user-role", user.role);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
