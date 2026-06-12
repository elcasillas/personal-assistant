import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Execute, d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routineId, runId } = await params;

  // Verify the run belongs to this user and routine before deleting.
  const rows = await d1Query<{ id: string }>(
    "SELECT id FROM routine_runs WHERE id = ? AND routine_id = ? AND user_id = ?",
    [runId, routineId, user.id]
  );
  if (rows.length === 0)
    return NextResponse.json({ error: "Run not found" }, { status: 404 });

  await d1Execute("DELETE FROM routine_runs WHERE id = ?", [runId]);

  return NextResponse.json({ deleted: true });
}
