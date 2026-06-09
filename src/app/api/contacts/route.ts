import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { Contact } from "@/lib/types";

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    title: row.title ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const rows = await d1Query<ContactRow>(
      "SELECT * FROM contacts ORDER BY name ASC"
    );
    return NextResponse.json(rows.map(rowToContact));
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
      `INSERT INTO contacts (id, name, email, phone, company, title, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.name,
        body.email ?? null,
        body.phone ?? null,
        body.company ?? null,
        body.title ?? null,
        body.notes ?? null,
        now,
        now,
      ]
    );

    const rows = await d1Query<ContactRow>("SELECT * FROM contacts WHERE id = ?", [id]);
    return NextResponse.json(rowToContact(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    await d1Execute(
      `UPDATE contacts
       SET name = ?, email = ?, phone = ?, company = ?, title = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        body.name,
        body.email ?? null,
        body.phone ?? null,
        body.company ?? null,
        body.title ?? null,
        body.notes ?? null,
        now,
        body.id,
      ]
    );

    const rows = await d1Query<ContactRow>("SELECT * FROM contacts WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToContact(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await d1Execute("DELETE FROM contacts WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
