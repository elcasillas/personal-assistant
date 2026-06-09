import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { Draft } from "@/lib/types";

type DraftRow = {
  id: string;
  type: string;
  subject: string;
  content: string;
  recipient: string | null;
  created_at: string;
  updated_at: string;
};

function rowToDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    type: row.type as Draft["type"],
    subject: row.subject,
    content: row.content,
    to: row.recipient ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const rows = await d1Query<DraftRow>(
      "SELECT * FROM drafts ORDER BY updated_at DESC"
    );
    return NextResponse.json(rows.map(rowToDraft));
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
      `INSERT INTO drafts (id, type, subject, content, recipient, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.type ?? "email",
        body.subject,
        body.content ?? "",
        body.to ?? null,
        now,
        now,
      ]
    );

    const rows = await d1Query<DraftRow>("SELECT * FROM drafts WHERE id = ?", [id]);
    return NextResponse.json(rowToDraft(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    await d1Execute(
      `UPDATE drafts SET type = ?, subject = ?, content = ?, recipient = ?, updated_at = ? WHERE id = ?`,
      [
        body.type,
        body.subject,
        body.content,
        body.to ?? null,
        now,
        body.id,
      ]
    );

    const rows = await d1Query<DraftRow>("SELECT * FROM drafts WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToDraft(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await d1Execute("DELETE FROM drafts WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
