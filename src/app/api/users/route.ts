import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { getSessionFromHeaders } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { v4 as uuidv4 } from "uuid";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

type UserRow = { id: string; name: string; email: string; role: string; created_at: string; updated_at: string };

function rowToUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role as User["role"], createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET(req: NextRequest) {
  const session = getSessionFromHeaders(req.headers);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await d1Query<UserRow>("SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at ASC");
    return NextResponse.json(rows.map(rowToUser));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionFromHeaders(req.headers);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
    const now = new Date().toISOString();
    const id = uuidv4();
    const hash = await hashPassword(password);
    await d1Execute(
      "INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, name, email.toLowerCase().trim(), hash, role ?? "user", now, now]
    );
    const rows = await d1Query<UserRow>("SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?", [id]);
    return NextResponse.json(rowToUser(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
