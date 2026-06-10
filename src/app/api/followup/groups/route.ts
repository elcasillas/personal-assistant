import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";

function userId(req: NextRequest) {
  return req.headers.get("x-user-id") ?? "";
}

type GroupRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  collapsed: number;
  sort_order: number;
};

function rowToGroup(r: GroupRow) {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    collapsed: r.collapsed === 1,
    order: r.sort_order,
  };
}

export async function GET(req: NextRequest) {
  try {
    const uid = userId(req);
    const rows = await d1Query<GroupRow>(
      "SELECT * FROM followup_groups WHERE user_id = ? ORDER BY sort_order ASC",
      [uid]
    );
    return NextResponse.json(rows.map(rowToGroup));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = userId(req);
    const body = await req.json();
    await d1Execute(
      "INSERT INTO followup_groups (id, user_id, name, color, collapsed, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [body.id, uid, body.name, body.color ?? "#6366f1", body.collapsed ? 1 : 0, body.order ?? 0]
    );
    const rows = await d1Query<GroupRow>("SELECT * FROM followup_groups WHERE id = ?", [body.id]);
    return NextResponse.json(rowToGroup(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = userId(req);
    const body = await req.json();
    const { id, ...updates } = body;
    const fields: string[] = [];
    const params: unknown[] = [];
    if (updates.name !== undefined) { fields.push("name = ?"); params.push(updates.name); }
    if (updates.color !== undefined) { fields.push("color = ?"); params.push(updates.color); }
    if (updates.collapsed !== undefined) { fields.push("collapsed = ?"); params.push(updates.collapsed ? 1 : 0); }
    if (updates.order !== undefined) { fields.push("sort_order = ?"); params.push(updates.order); }
    if (fields.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    params.push(id, uid);
    await d1Execute(`UPDATE followup_groups SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const rows = await d1Query<GroupRow>("SELECT * FROM followup_groups WHERE id = ?", [id]);
    return NextResponse.json(rowToGroup(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = userId(req);
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Cascade: delete child updates → child items → group (all scoped to this user)
    const items = await d1Query<{ id: string }>(
      "SELECT id FROM followup_items WHERE group_id = ? AND user_id = ?",
      [body.id, uid]
    );
    if (items.length > 0) {
      const placeholders = items.map(() => "?").join(", ");
      const itemIds = items.map((r) => r.id);
      await d1Execute(
        `DELETE FROM followup_updates WHERE followup_id IN (${placeholders}) AND user_id = ?`,
        [...itemIds, uid]
      );
      await d1Execute(
        "DELETE FROM followup_items WHERE group_id = ? AND user_id = ?",
        [body.id, uid]
      );
    }
    await d1Execute(
      "DELETE FROM followup_groups WHERE id = ? AND user_id = ?",
      [body.id, uid]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[followup/groups DELETE]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
