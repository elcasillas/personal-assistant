import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const groups = await d1Query<Record<string, unknown>>(
    "SELECT id, name, color, collapsed, sort_order FROM todo_groups WHERE user_id = ? ORDER BY sort_order ASC",
    [user.id]
  );

  return NextResponse.json(
    groups.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      collapsed: r.collapsed === 1 || r.collapsed === true,
      order: r.sort_order,
    }))
  );
}

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id, name, color, collapsed, order } = await req.json();
  await d1Execute(
    "INSERT INTO todo_groups (id, user_id, name, color, collapsed, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    [id, user.id, name, color, collapsed ? 1 : 0, order]
  );
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push("name = ?"); params.push(updates.name); }
  if (updates.color !== undefined) { fields.push("color = ?"); params.push(updates.color); }
  if (updates.collapsed !== undefined) { fields.push("collapsed = ?"); params.push(updates.collapsed ? 1 : 0); }
  if (updates.order !== undefined) { fields.push("sort_order = ?"); params.push(updates.order); }

  if (fields.length === 0) return NextResponse.json({ ok: true });

  params.push(id, user.id);
  await d1Execute(
    `UPDATE todo_groups SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    params
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return unauth();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Cascade: delete updates then tasks then group — all scoped to this user
  const tasks = await d1Query<{ id: string }>(
    "SELECT id FROM todo_tasks WHERE group_id = ? AND user_id = ?",
    [id, user.id]
  );
  const taskIds = tasks.map((t) => t.id);

  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => "?").join(", ");
    await d1Execute(
      `DELETE FROM todo_task_updates WHERE task_id IN (${placeholders}) AND user_id = ?`,
      [...taskIds, user.id]
    );
    await d1Execute(
      "DELETE FROM todo_tasks WHERE group_id = ? AND user_id = ?",
      [id, user.id]
    );
  }

  await d1Execute("DELETE FROM todo_groups WHERE id = ? AND user_id = ?", [id, user.id]);
  return NextResponse.json({ ok: true });
}
