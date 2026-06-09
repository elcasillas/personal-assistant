import { NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { hashPassword } from "@/lib/password";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const existing = await d1Query("SELECT id FROM users LIMIT 1");
    if (existing.length > 0) return NextResponse.json({ error: "Users already exist. Seed can only run once." }, { status: 400 });

    const now = new Date().toISOString();
    const id = uuidv4();
    const hash = await hashPassword("Admin123!");
    await d1Execute(
      "INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, "Admin", "admin@linda.app", hash, "admin", now, now]
    );
    return NextResponse.json({ success: true, message: "Admin created: admin@linda.app / Admin123! — change the password immediately." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
