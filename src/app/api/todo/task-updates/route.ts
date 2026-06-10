import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const rows = await d1Query<Record<string, unknown>>(
    `SELECT id, task_id, author_name, author_initials, author_color, content, created_at, updated_at
     FROM todo_task_updates WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC`,
    [taskId, user.id]
  );

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      authorName: r.author_name || "",
      authorInitials: r.author_initials || "",
      authorColor: r.author_color || "#64748b",
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
}

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const u = await req.json();
  await d1Execute(
    `INSERT INTO todo_task_updates
      (id, user_id, task_id, author_name, author_initials, author_color, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [u.id, user.id, u.taskId, u.authorName, u.authorInitials, u.authorColor, u.content, u.createdAt, u.updatedAt]
  );
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id, content } = await req.json();
  if (!id || content === undefined) return NextResponse.json({ error: "id and content required" }, { status: 400 });

  await d1Execute(
    "UPDATE todo_task_updates SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [content, new Date().toISOString(), id, user.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await d1Execute(
    "DELETE FROM todo_task_updates WHERE id = ? AND user_id = ?",
    [id, user.id]
  );
  return NextResponse.json({ ok: true });
}
