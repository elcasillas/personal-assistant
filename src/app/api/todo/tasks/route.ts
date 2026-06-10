import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute, d1Batch } from "@/lib/d1";

export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const tasks = await d1Query<Record<string, unknown>>(
    `SELECT id, title, owner_name, owner_initials, owner_color, owner_avatar,
            status, due_date, priority, notes, completed, group_id, sort_order,
            created_at, updated_at
     FROM todo_tasks WHERE user_id = ? ORDER BY sort_order ASC`,
    [user.id]
  );

  return NextResponse.json(
    tasks.map((r) => ({
      id: r.id,
      title: r.title,
      owner: r.owner_name
        ? {
            name: r.owner_name,
            initials: r.owner_initials || "",
            color: r.owner_color || "#3b82f6",
            avatar: r.owner_avatar || undefined,
          }
        : null,
      status: r.status,
      dueDate: r.due_date || null,
      priority: r.priority,
      notes: r.notes || "",
      completed: r.completed === 1 || r.completed === true,
      groupId: r.group_id,
      order: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
}

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const t = await req.json();
  await d1Execute(
    `INSERT INTO todo_tasks
      (id, user_id, title, owner_name, owner_initials, owner_color, owner_avatar,
       status, due_date, priority, notes, completed, group_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id, user.id, t.title,
      t.owner?.name ?? null, t.owner?.initials ?? null,
      t.owner?.color ?? null, t.owner?.avatar ?? null,
      t.status, t.dueDate ?? null, t.priority,
      t.notes ?? "", t.completed ? 1 : 0,
      t.groupId, t.order, t.createdAt, t.updatedAt,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const fields: string[] = ["updated_at = ?"];
  const params: unknown[] = [new Date().toISOString()];

  if (updates.title !== undefined) { fields.push("title = ?"); params.push(updates.title); }
  if (updates.status !== undefined) { fields.push("status = ?"); params.push(updates.status); }
  if ("dueDate" in updates) { fields.push("due_date = ?"); params.push(updates.dueDate ?? null); }
  if (updates.priority !== undefined) { fields.push("priority = ?"); params.push(updates.priority); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); params.push(updates.notes); }
  if (updates.completed !== undefined) { fields.push("completed = ?"); params.push(updates.completed ? 1 : 0); }
  if (updates.groupId !== undefined) { fields.push("group_id = ?"); params.push(updates.groupId); }
  if (updates.order !== undefined) { fields.push("sort_order = ?"); params.push(updates.order); }
  if ("owner" in updates) {
    fields.push("owner_name = ?", "owner_initials = ?", "owner_color = ?", "owner_avatar = ?");
    params.push(
      updates.owner?.name ?? null,
      updates.owner?.initials ?? null,
      updates.owner?.color ?? null,
      updates.owner?.avatar ?? null,
    );
  }

  params.push(id, user.id);
  await d1Execute(
    `UPDATE todo_tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    params
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await d1Batch([
    {
      sql: "DELETE FROM todo_task_updates WHERE task_id = ? AND user_id = ?",
      params: [id, user.id],
    },
    {
      sql: "DELETE FROM todo_tasks WHERE id = ? AND user_id = ?",
      params: [id, user.id],
    },
  ]);
  return NextResponse.json({ ok: true });
}
