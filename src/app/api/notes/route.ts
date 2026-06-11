import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { Note } from "@/lib/types";

type NoteRow = {
  id: string;
  title: string;
  content: string;
  tags: string;
  archived: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags ?? "[]"),
    archived: row.archived === 1,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get("archived");
    const archivedFlag = archivedParam === "true" ? 1 : 0;

    const rows = await d1Query<NoteRow>(
      "SELECT * FROM notes WHERE archived = ? ORDER BY updated_at DESC",
      [archivedFlag]
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
      `INSERT INTO notes (id, title, content, tags, archived, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.title, body.content ?? "", JSON.stringify(body.tags ?? []), 0, null, now, now]
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
      [body.title, body.content, JSON.stringify(body.tags ?? []), now, body.id]
    );

    const rows = await d1Query<NoteRow>("SELECT * FROM notes WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToNote(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Archive / unarchive a note
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const now = new Date().toISOString();
    const archived = body.archived ? 1 : 0;
    const archivedAt = body.archived ? now : null;

    await d1Execute(
      "UPDATE notes SET archived = ?, archived_at = ?, updated_at = ? WHERE id = ?",
      [archived, archivedAt, now, body.id]
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
