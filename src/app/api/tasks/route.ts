import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";
import type { Task } from "@/lib/types";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const rows = await d1Query<TaskRow>(
      "SELECT * FROM tasks ORDER BY created_at DESC"
    );
    return NextResponse.json(rows.map(rowToTask));
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
      `INSERT INTO tasks (id, title, description, status, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.title,
        body.description ?? null,
        body.status ?? "todo",
        body.priority ?? "medium",
        body.dueDate ?? null,
        now,
        now,
      ]
    );

    const rows = await d1Query<TaskRow>("SELECT * FROM tasks WHERE id = ?", [id]);
    return NextResponse.json(rowToTask(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    await d1Execute(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = ?
       WHERE id = ?`,
      [
        body.title,
        body.description ?? null,
        body.status,
        body.priority,
        body.dueDate ?? null,
        now,
        body.id,
      ]
    );

    const rows = await d1Query<TaskRow>("SELECT * FROM tasks WHERE id = ?", [body.id]);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rowToTask(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await d1Execute("DELETE FROM tasks WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
