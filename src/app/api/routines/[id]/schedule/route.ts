import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { putWorkerSchedules } from "@/lib/cloudflare-schedules";
import { validateCronExpression } from "@/lib/cron-utils";

export const dynamic = "force-dynamic";

interface SchedulePayload {
  scheduleEnabled: boolean;
  scheduleFrequency: string | null;
  scheduleTime: string | null;
  scheduleWeekday: number | null;
  scheduleMonthDay: number | null;
  scheduleTimezone: string;
  scheduleCron: string | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as SchedulePayload;

  if (body.scheduleEnabled && body.scheduleCron) {
    const v = validateCronExpression(body.scheduleCron);
    if (!v.valid) {
      return NextResponse.json({ error: `Invalid cron expression: ${v.error}` }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  await d1Execute(
    `UPDATE routines SET
       schedule_enabled = ?, schedule_frequency = ?, schedule_time = ?,
       schedule_weekday = ?, schedule_month_day = ?, schedule_timezone = ?,
       schedule_cron = ?, last_schedule_updated_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      body.scheduleEnabled ? 1 : 0,
      body.scheduleFrequency ?? null,
      body.scheduleTime ?? null,
      body.scheduleWeekday ?? null,
      body.scheduleMonthDay ?? null,
      body.scheduleTimezone || "America/New_York",
      body.scheduleCron ?? null,
      now,
      now,
      id,
      user.id,
    ]
  );

  console.log("[schedule] saved id=%s enabled=%s cron=%s", id, body.scheduleEnabled, body.scheduleCron);

  // Rebuild Cloudflare Worker cron triggers from all enabled routine schedules.
  let cfUpdated = false;
  let cfError: string | null = null;

  try {
    const rows = await d1Query<{ schedule_cron: string }>(
      `SELECT schedule_cron FROM routines
       WHERE user_id = ? AND schedule_enabled = 1 AND schedule_cron IS NOT NULL AND active = 1`,
      [user.id]
    );
    const uniqueCrons = [...new Set(rows.map((r) => r.schedule_cron).filter(Boolean) as string[])];
    await putWorkerSchedules(uniqueCrons);
    cfUpdated = true;
    console.log("[schedule] CF triggers updated: [%s]", uniqueCrons.join(", ") || "none");
  } catch (err) {
    cfError = err instanceof Error ? err.message : String(err);
    console.error("[schedule] CF update failed:", cfError);
  }

  return NextResponse.json({ saved: true, cfUpdated, cfError });
}
