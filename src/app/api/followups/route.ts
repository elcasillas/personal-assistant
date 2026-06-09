import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getObject, putObject } from "@/lib/r2";
import type { FollowUp } from "@/lib/types";

const KEY = "data/followups.json";

export async function GET() {
  const followups = await getObject<FollowUp[]>(KEY, []);
  return NextResponse.json(followups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const followups = await getObject<FollowUp[]>(KEY, []);
  const now = new Date().toISOString();
  const followup: FollowUp = {
    id: uuidv4(),
    contactId: body.contactId,
    contactName: body.contactName,
    subject: body.subject,
    dueDate: body.dueDate,
    status: body.status ?? "pending",
    notes: body.notes,
    createdAt: now,
    updatedAt: now,
  };
  followups.push(followup);
  await putObject(KEY, followups);
  return NextResponse.json(followup, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const followups = await getObject<FollowUp[]>(KEY, []);
  const index = followups.findIndex((f) => f.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }
  const updated: FollowUp = {
    ...followups[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  followups[index] = updated;
  await putObject(KEY, followups);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const followups = await getObject<FollowUp[]>(KEY, []);
  const filtered = followups.filter((f) => f.id !== id);
  await putObject(KEY, filtered);
  return NextResponse.json({ success: true });
}
