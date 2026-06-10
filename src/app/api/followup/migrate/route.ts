import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";

type OldRow = {
  id: string;
  contact_id: string | null;
  contact_name: string;
  subject: string;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-user-id") ?? "";

  try {
    const existing = await d1Query<{ id: string }>(
      "SELECT id FROM followup_items WHERE user_id = ? LIMIT 1",
      [uid]
    );
    if (existing.length > 0) {
      return NextResponse.json({ skipped: true, reason: "Data already migrated." });
    }

    const old = await d1Query<OldRow>("SELECT * FROM followups ORDER BY due_date ASC");
    if (old.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const groupId = uuidv4();
    const now = new Date().toISOString();
    await d1Execute(
      "INSERT INTO followup_groups (id, user_id, name, color, collapsed, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [groupId, uid, "Imported", "#6366f1", 0, 0]
    );

    let order = 0;
    for (const row of old) {
      const status = row.status === "completed" ? "done" : "not_started";
      const completed = status === "done" ? 1 : 0;
      await d1Execute(
        `INSERT OR IGNORE INTO followup_items
           (id, user_id, subject, contact_name, contact_id, status, priority, due_date, notes, completed, group_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id, uid, row.subject, row.contact_name, row.contact_id ?? null,
          status, "medium", row.due_date, row.notes ?? "",
          completed, groupId, order++, row.created_at, row.updated_at,
        ]
      );
    }

    return NextResponse.json({ migrated: old.length, groupId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
