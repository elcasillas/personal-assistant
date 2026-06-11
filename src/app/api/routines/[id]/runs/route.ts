import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

type RoutineRunRow = {
  id: string;
  user_id: string;
  routine_id: string;
  routine_name: string;
  output: string;
  status: string;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

function parseRun(row: RoutineRunRow) {
  return {
    id: row.id,
    userId: row.user_id,
    routineId: row.routine_id,
    routineName: row.routine_name || "",
    output: row.output || "",
    status: row.status as "running" | "success" | "failed",
    error: row.error ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routineId } = await params;

  const rows = await d1Query<RoutineRunRow>(
    "SELECT * FROM routine_runs WHERE routine_id = ? AND user_id = ? ORDER BY created_at DESC",
    [routineId, user.id]
  );

  return NextResponse.json(rows.map(parseRun));
}
