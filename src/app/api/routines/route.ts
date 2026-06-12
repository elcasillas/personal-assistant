import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";
import { DAILY_SUMMARY_NAME, DAILY_SUMMARY_INSTRUCTIONS, DAILY_SUMMARY_OUTPUT_FORMAT } from "@/lib/routine-defaults";

export const dynamic = "force-dynamic";

const DEFAULT_ROUTINE = {
  name: DAILY_SUMMARY_NAME,
  description: "Executive-friendly daily summary of Tasks and Follow-ups due today or overdue.",
  triggerPhrases: [
    "What's due today?",
    "Summarize my tasks and follow-ups",
    "What is late?",
    "Give me my daily summary",
    "What do I need to follow up on today?",
    "Daily action summary",
  ],
  instructions: DAILY_SUMMARY_INSTRUCTIONS,
  dataSources: ["Tasks", "Follow-ups"],
  outputFormat: DAILY_SUMMARY_OUTPUT_FORMAT,
};

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
  };
}

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rows = await d1Query<RoutineRow>(
    "SELECT * FROM routines WHERE user_id = ? ORDER BY created_at ASC",
    [user.id]
  );

  // Auto-seed default routine on first load
  if (rows.length === 0) {
    const id = uuidv4();
    const now = new Date().toISOString();
    await d1Execute(
      `INSERT INTO routines (id, user_id, name, description, trigger_phrases, instructions, data_sources, output_format, active, last_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        DEFAULT_ROUTINE.name,
        DEFAULT_ROUTINE.description,
        JSON.stringify(DEFAULT_ROUTINE.triggerPhrases),
        DEFAULT_ROUTINE.instructions,
        JSON.stringify(DEFAULT_ROUTINE.dataSources),
        DEFAULT_ROUTINE.outputFormat,
        1,
        null,
        now,
        now,
      ]
    );
    rows = await d1Query<RoutineRow>(
      "SELECT * FROM routines WHERE user_id = ? ORDER BY created_at ASC",
      [user.id]
    );
  }

  return NextResponse.json(rows.map(parseRoutine));
}

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();

  await d1Execute(
    `INSERT INTO routines (id, user_id, name, description, trigger_phrases, instructions, data_sources, output_format, active, last_run_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user.id,
      body.name ?? "Untitled Routine",
      body.description ?? "",
      JSON.stringify(body.triggerPhrases ?? []),
      body.instructions ?? "",
      JSON.stringify(body.dataSources ?? []),
      body.outputFormat ?? "",
      body.active !== false ? 1 : 0,
      null,
      now,
      now,
    ]
  );

  const rows = await d1Query<RoutineRow>("SELECT * FROM routines WHERE id = ?", [id]);
  return NextResponse.json(parseRoutine(rows[0]), { status: 201 });
}
