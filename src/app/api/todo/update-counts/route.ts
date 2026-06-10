import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await d1Query<{ task_id: string }>(
    "SELECT task_id FROM todo_task_updates WHERE user_id = ?",
    [user.id]
  );

  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    counts[r.task_id] = (counts[r.task_id] ?? 0) + 1;
  });

  return NextResponse.json(counts);
}
