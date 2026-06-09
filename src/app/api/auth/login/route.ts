import { NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UserRow = { id: string; name: string; email: string; password_hash: string; role: string };

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const rows = await d1Query<UserRow>(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user: SessionUser = { id: row.id, email: row.email, name: row.name, role: row.role as "admin" | "user" };
    const token = await createSessionToken(user);
    const res = NextResponse.json({ user });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
