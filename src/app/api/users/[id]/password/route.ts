import { NextRequest, NextResponse } from "next/server";
import { d1Execute } from "@/lib/d1";
import { getSessionFromHeaders } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromHeaders(req.headers);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const { password } = await req.json();
    if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const hash = await hashPassword(password);
    await d1Execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hash, new Date().toISOString(), id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
