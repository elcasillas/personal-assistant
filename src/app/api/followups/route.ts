import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { FollowUp } from "@/lib/types";

type FollowUpRow = {
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

function rowToFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name,
    subject: row.subject,
    dueDate: row.due_date,
    status: row.status as FollowUp["status"],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const rows = await d1Query<FollowUpRow>(
      "SELECT * FROM followups ORDER BY due_date ASC"
    );
    return NextResponse.json(rows.map(rowToFollowUp));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const id = uuidv4();

    await d1Execute(
      `INSERT INTO followups (id, contact_id, contact_name, subject, due_date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.contactId ?? null,
        body.contactName,
        body.subject,
        body.dueDate,
        body.status ?? "pending",
        body.notes ?? null,
        now,
        now,
      ]
    );

    const rows = await d1Query<FollowUpRow>("SELECT * FROM followups WHERE id = ?", [id]);
    return NextResponse.json(rowToFollowUp(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    await d1Execute(
      `UPDATE followups
       SET contact_id = ?, contact_name = ?, subject = ?, due_date = ?, status = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        body.contactId ?? null,
        body.contactName,
        body.subject,
        body.dueDate,
        body.status,
        body.notes ?? null,
        now,
        body.id,
      ]
    );

    const rows = await d1Query<FollowUpRow>("SELECT * FROM followups WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToFollowUp(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await d1Execute("DELETE FROM followups WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
