import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getObject, putObject } from "@/lib/r2";
import type { Draft } from "@/lib/types";

const KEY = "data/drafts.json";

export async function GET() {
  const drafts = await getObject<Draft[]>(KEY, []);
  return NextResponse.json(drafts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const drafts = await getObject<Draft[]>(KEY, []);
  const now = new Date().toISOString();
  const draft: Draft = {
    id: uuidv4(),
    type: body.type ?? "email",
    subject: body.subject,
    content: body.content ?? "",
    to: body.to,
    createdAt: now,
    updatedAt: now,
  };
  drafts.push(draft);
  await putObject(KEY, drafts);
  return NextResponse.json(draft, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const drafts = await getObject<Draft[]>(KEY, []);
  const index = drafts.findIndex((d) => d.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  const updated: Draft = {
    ...drafts[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  drafts[index] = updated;
  await putObject(KEY, drafts);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const drafts = await getObject<Draft[]>(KEY, []);
  const filtered = drafts.filter((d) => d.id !== id);
  await putObject(KEY, filtered);
  return NextResponse.json({ success: true });
}
