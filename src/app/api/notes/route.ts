import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getObject, putObject } from "@/lib/r2";
import type { Note } from "@/lib/types";

const KEY = "data/notes.json";

export async function GET() {
  const notes = await getObject<Note[]>(KEY, []);
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const notes = await getObject<Note[]>(KEY, []);
  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    title: body.title,
    content: body.content ?? "",
    tags: body.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  notes.push(note);
  await putObject(KEY, notes);
  return NextResponse.json(note, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const notes = await getObject<Note[]>(KEY, []);
  const index = notes.findIndex((n) => n.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  const updated: Note = {
    ...notes[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  notes[index] = updated;
  await putObject(KEY, notes);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const notes = await getObject<Note[]>(KEY, []);
  const filtered = notes.filter((n) => n.id !== id);
  await putObject(KEY, filtered);
  return NextResponse.json({ success: true });
}
