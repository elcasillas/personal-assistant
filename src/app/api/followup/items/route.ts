import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute, d1Batch } from "@/lib/d1";

function userId(req: NextRequest) {
  return req.headers.get("x-user-id") ?? "";
}

type ItemRow = {
  id: string;
  user_id: string;
  subject: string;
  contact_name: string;
  contact_id: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string;
  completed: number;
  group_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToItem(r: ItemRow) {
  return {
    id: r.id,
    subject: r.subject,
    contactName: r.contact_name,
    contactId: r.contact_id ?? null,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date ?? null,
    notes: r.notes,
    completed: r.completed === 1,
    groupId: r.group_id,
    order: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const uid = userId(req);
    const rows = await d1Query<ItemRow>(
      "SELECT * FROM followup_items WHERE user_id = ? ORDER BY sort_order ASC",
      [uid]
    );
    return NextResponse.json(rows.map(rowToItem));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = userId(req);
    const b = await req.json();
    await d1Execute(
      `INSERT INTO followup_items
         (id, user_id, subject, contact_name, contact_id, status, priority, due_date, notes, completed, group_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.id, uid, b.subject, b.contactName ?? "", b.contactId ?? null,
        b.status ?? "not_started", b.priority ?? "medium",
        b.dueDate ?? null, b.notes ?? "",
        b.completed ? 1 : 0, b.groupId, b.order ?? 0,
        b.createdAt ?? new Date().toISOString(),
        b.updatedAt ?? new Date().toISOString(),
      ]
    );
    const rows = await d1Query<ItemRow>("SELECT * FROM followup_items WHERE id = ?", [b.id]);
    return NextResponse.json(rowToItem(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = userId(req);
    const { id, ...updates } = await req.json();
    const fields = ["updated_at = ?"];
    const params: unknown[] = [new Date().toISOString()];

    if (updates.subject !== undefined) { fields.push("subject = ?"); params.push(updates.subject); }
    if (updates.contactName !== undefined) { fields.push("contact_name = ?"); params.push(updates.contactName); }
    if ("contactId" in updates) { fields.push("contact_id = ?"); params.push(updates.contactId ?? null); }
    if (updates.status !== undefined) {
      fields.push("status = ?"); params.push(updates.status);
      fields.push("completed = ?"); params.push(updates.status === "done" ? 1 : 0);
    }
    if (updates.priority !== undefined) { fields.push("priority = ?"); params.push(updates.priority); }
    if ("dueDate" in updates) { fields.push("due_date = ?"); params.push(updates.dueDate ?? null); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); params.push(updates.notes); }
    if (updates.groupId !== undefined) { fields.push("group_id = ?"); params.push(updates.groupId); }
    if (updates.order !== undefined) { fields.push("sort_order = ?"); params.push(updates.order); }
    if (updates.completed !== undefined && updates.status === undefined) {
      fields.push("completed = ?"); params.push(updates.completed ? 1 : 0);
      fields.push("status = ?"); params.push(updates.completed ? "done" : "not_started");
    }

    params.push(id, uid);
    await d1Execute(`UPDATE followup_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const rows = await d1Query<ItemRow>("SELECT * FROM followup_items WHERE id = ?", [id]);
    return NextResponse.json(rows.length ? rowToItem(rows[0]) : { id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = userId(req);
    const { id } = await req.json();
    await d1Batch([
      { sql: "DELETE FROM followup_updates WHERE followup_id = ? AND user_id = ?", params: [id, uid] },
      { sql: "DELETE FROM followup_items WHERE id = ? AND user_id = ?", params: [id, uid] },
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
