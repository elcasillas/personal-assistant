import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { Note } from "@/lib/types";

type NoteRow = {
  id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags ?? "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const rows = await d1Query<NoteRow>(
      "SELECT * FROM notes ORDER BY updated_at DESC"
    );
    return NextResponse.json(rows.map(rowToNote));
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
      `INSERT INTO notes (id, title, content, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.title,
        body.content ?? "",
        JSON.stringify(body.tags ?? []),
        now,
        now,
      ]
    );

    const rows = await d1Query<NoteRow>("SELECT * FROM notes WHERE id = ?", [id]);
    return NextResponse.json(rowToNote(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    await d1Execute(
      `UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ? WHERE id = ?`,
      [
        body.title,
        body.content,
        JSON.stringify(body.tags ?? []),
        now,
        body.id,
      ]
    );

    const rows = await d1Query<NoteRow>("SELECT * FROM notes WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToNote(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await d1Execute("DELETE FROM notes WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
