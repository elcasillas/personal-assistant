import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getObject, putObject } from "@/lib/r2";
import type { Task } from "@/lib/types";

const KEY = "data/tasks.json";

export async function GET() {
  const tasks = await getObject<Task[]>(KEY, []);
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tasks = await getObject<Task[]>(KEY, []);
  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    status: body.status ?? "todo",
    priority: body.priority ?? "medium",
    dueDate: body.dueDate,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  await putObject(KEY, tasks);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const tasks = await getObject<Task[]>(KEY, []);
  const index = tasks.findIndex((t) => t.id === body.id);
  if (index === -1) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const updated: Task = {
    ...tasks[index],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  tasks[index] = updated;
  await putObject(KEY, tasks);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const tasks = await getObject<Task[]>(KEY, []);
  const filtered = tasks.filter((t) => t.id !== id);
  await putObject(KEY, filtered);
  return NextResponse.json({ success: true });
}
