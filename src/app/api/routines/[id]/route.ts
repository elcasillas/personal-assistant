import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

type RoutineRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  trigger_phrases: string;
  instructions: string;
  data_sources: string;
  output_format: string;
  active: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  schedule_enabled: number | null;
  schedule_frequency: string | null;
  schedule_time: string | null;
  schedule_weekday: number | null;
  schedule_month_day: number | null;
  schedule_timezone: string | null;
  schedule_cron: string | null;
  last_schedule_updated_at: string | null;
};

function parseRoutine(row: RoutineRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    triggerPhrases: JSON.parse(row.trigger_phrases || "[]") as string[],
    instructions: row.instructions,
    dataSources: JSON.parse(row.data_sources || "[]") as string[],
    outputFormat: row.output_format,
    active: row.active === 1,
    lastRunAt: row.last_run_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduleEnabled: row.schedule_enabled === 1,
    scheduleFrequency: (row.schedule_frequency ?? null) as "daily" | "weekly" | "monthly" | "custom" | null,
    scheduleTime: row.schedule_time ?? null,
    scheduleWeekday: row.schedule_weekday ?? null,
    scheduleMonthDay: row.schedule_month_day ?? null,
    scheduleTimezone: row.schedule_timezone ?? "America/New_York",
    scheduleCron: row.schedule_cron ?? null,
    lastScheduleUpdatedAt: row.last_schedule_updated_at ?? null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await d1Query<RoutineRow>(
    "SELECT * FROM routines WHERE id = ? AND user_id = ?",
    [id, user.id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(parseRoutine(rows[0]));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const now = new Date().toISOString();

  const fields: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (body.name !== undefined) { fields.push("name = ?"); values.push(body.name); }
  if (body.description !== undefined) { fields.push("description = ?"); values.push(body.description); }
  if (body.triggerPhrases !== undefined) { fields.push("trigger_phrases = ?"); values.push(JSON.stringify(body.triggerPhrases)); }
  if (body.instructions !== undefined) { fields.push("instructions = ?"); values.push(body.instructions); }
  if (body.dataSources !== undefined) { fields.push("data_sources = ?"); values.push(JSON.stringify(body.dataSources)); }
  if (body.outputFormat !== undefined) { fields.push("output_format = ?"); values.push(body.outputFormat); }
  if (body.active !== undefined) { fields.push("active = ?"); values.push(body.active ? 1 : 0); }

  values.push(id, user.id);
  await d1Execute(
    `UPDATE routines SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    values
  );

  const rows = await d1Query<RoutineRow>(
    "SELECT * FROM routines WHERE id = ? AND user_id = ?",
    [id, user.id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(parseRoutine(rows[0]));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await d1Execute("DELETE FROM routine_runs WHERE routine_id = ? AND user_id = ?", [id, user.id]);
  await d1Execute("DELETE FROM routines WHERE id = ? AND user_id = ?", [id, user.id]);

  return NextResponse.json({ deleted: true });
}
