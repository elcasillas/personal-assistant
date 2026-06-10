import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";

function userId(req: NextRequest) {
  return req.headers.get("x-user-id") ?? "";
}

type UpdateRow = {
  id: string;
  user_id: string;
  followup_id: string;
  author_name: string;
  author_initials: string;
  author_color: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function rowToUpdate(r: UpdateRow) {
  return {
    id: r.id,
    followupId: r.followup_id,
    authorName: r.author_name,
    authorInitials: r.author_initials,
    authorColor: r.author_color,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const uid = userId(req);
    const { searchParams } = new URL(req.url);
    const followupId = searchParams.get("followupId");
    if (!followupId) return NextResponse.json({ error: "Missing followupId" }, { status: 400 });
    const rows = await d1Query<UpdateRow>(
      "SELECT * FROM followup_updates WHERE followup_id = ? AND user_id = ? ORDER BY created_at DESC",
      [followupId, uid]
    );
    return NextResponse.json(rows.map(rowToUpdate));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = userId(req);
    const b = await req.json();
    await d1Execute(
      `INSERT INTO followup_updates (id, user_id, followup_id, author_name, author_initials, author_color, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, uid, b.followupId, b.authorName, b.authorInitials, b.authorColor, b.content, b.createdAt, b.updatedAt]
    );
    const rows = await d1Query<UpdateRow>("SELECT * FROM followup_updates WHERE id = ?", [b.id]);
    return NextResponse.json(rowToUpdate(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = userId(req);
    const { id, content } = await req.json();
    const now = new Date().toISOString();
    await d1Execute(
      "UPDATE followup_updates SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      [content, now, id, uid]
    );
    const rows = await d1Query<UpdateRow>("SELECT * FROM followup_updates WHERE id = ?", [id]);
    return NextResponse.json(rowToUpdate(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = userId(req);
    const { id } = await req.json();
    await d1Execute("DELETE FROM followup_updates WHERE id = ? AND user_id = ?", [id, uid]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
