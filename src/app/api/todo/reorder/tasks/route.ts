import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Batch } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = await req.json() as { items: { id: string; order: number }[] };
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();
  await d1Batch(
    items.map(({ id, order }) => ({
      sql: "UPDATE todo_tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      params: [order, now, id, user.id],
    }))
  );

  return NextResponse.json({ ok: true });
}
