import { NextResponse } from "next/server";
import { d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

// Each migration is idempotent — failures from "duplicate column" are silently ignored.
const migrations = [
  { name: "routine_runs.routine_name", sql: "ALTER TABLE routine_runs ADD COLUMN routine_name TEXT NOT NULL DEFAULT ''" },
  { name: "routine_runs.started_at",   sql: "ALTER TABLE routine_runs ADD COLUMN started_at TEXT" },
  { name: "routine_runs.completed_at", sql: "ALTER TABLE routine_runs ADD COLUMN completed_at TEXT" },
  { name: "idx_routine_runs_routine_id", sql: "CREATE INDEX IF NOT EXISTS idx_routine_runs_routine_id ON routine_runs (routine_id)" },
  { name: "idx_routine_runs_user_id",    sql: "CREATE INDEX IF NOT EXISTS idx_routine_runs_user_id ON routine_runs (user_id)" },
  { name: "idx_routine_runs_created_at", sql: "CREATE INDEX IF NOT EXISTS idx_routine_runs_created_at ON routine_runs (created_at)" },
  { name: "notes.archived",    sql: "ALTER TABLE notes ADD COLUMN archived INTEGER NOT NULL DEFAULT 0" },
  { name: "notes.archived_at", sql: "ALTER TABLE notes ADD COLUMN archived_at TEXT" },
];

export async function POST() {
  const results: { name: string; status: string; note?: string }[] = [];

  for (const m of migrations) {
    try {
      await d1Execute(m.sql);
      results.push({ name: m.name, status: "ok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Treat "duplicate column" as already applied — not a real error
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        results.push({ name: m.name, status: "already_applied" });
      } else {
        results.push({ name: m.name, status: "error", note: msg });
      }
    }
  }

  const hasErrors = results.some((r) => r.status === "error");
  return NextResponse.json({ results }, { status: hasErrors ? 500 : 200 });
}
