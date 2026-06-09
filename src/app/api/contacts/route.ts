import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getObject, putObject } from "@/lib/r2";
import type { Contact } from "@/lib/types";

const KEY = "data/contacts.json";

export async function GET() {
  const contacts = await getObject<Contact[]>(KEY, []);
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const contacts = await getObject<Contact[]>(KEY, []);
  const now = new Date().toISOString();
  const contact: Contact = {
    id: uuidv4(),
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    title: body.title,
    notes: body.notes,
    createdAt: now,
    updatedAt: now,
  };
  contacts.push(contact);
  await putObject(KEY, contacts);
  return NextResponse.json(contact, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const contacts = await getObject<Contact[]>(KEY, []);
  const index = contacts.findIndex((c) => c.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  const updated: Contact = {
    ...contacts[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  contacts[index] = updated;
  await putObject(KEY, contacts);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const contacts = await getObject<Contact[]>(KEY, []);
  const filtered = contacts.filter((c) => c.id !== id);
  await putObject(KEY, filtered);
  return NextResponse.json({ success: true });
}
