import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let items: { id: string; order: number }[];
  try {
    const body = await req.json();
    items = body?.items;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: true });

  if (items.some((item) => typeof item.id !== "string" || typeof item.order !== "number")) {
    return NextResponse.json({ error: "Each item must have a string id and number order" }, { status: 400 });
  }

  const now = new Date().toISOString();
  try {
    await Promise.all(
      items.map(({ id, order }) =>
        d1Execute(
          "UPDATE todo_tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?",
          [order, now, id, user.id]
        )
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[todo/reorder/tasks] failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
