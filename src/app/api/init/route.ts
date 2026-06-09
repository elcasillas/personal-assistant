import { NextResponse } from "next/server";
import { d1Batch } from "@/lib/d1";

export async function POST() {
  try {
    await d1Batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'todo',
          priority TEXT NOT NULL DEFAULT 'medium',
          due_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          title TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS followups (
          id TEXT PRIMARY KEY,
          contact_id TEXT,
          contact_name TEXT NOT NULL,
          subject TEXT NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS drafts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'email',
          subject TEXT NOT NULL,
          content TEXT NOT NULL,
          recipient TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
    ]);

    return NextResponse.json({ success: true, message: "Schema initialized" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
