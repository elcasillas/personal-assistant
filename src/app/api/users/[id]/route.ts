import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { getSessionFromHeaders } from "@/lib/auth";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

type UserRow = { id: string; name: string; email: string; role: string; created_at: string; updated_at: string };

function rowToUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role as User["role"], createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromHeaders(req.headers);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const { name, role } = await req.json();
    const now = new Date().toISOString();
    await d1Execute("UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?", [name, role, now, id]);
    const rows = await d1Query<UserRow>("SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?", [id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToUser(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromHeaders(req.headers);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (id === session.id) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  try {
    await d1Execute("DELETE FROM users WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
