import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const DEFAULT_ROUTINE = {
  name: "Daily Due and Overdue Summary",
  description: "Summarizes Tasks and Follow-ups that are due today or overdue.",
  triggerPhrases: [
    "What's due today?",
    "Summarize my tasks and follow-ups",
    "What is late?",
    "Give me my daily summary",
    "What do I need to follow up on today?",
  ],
  instructions: `Review all open Tasks and Follow-ups. Exclude completed or done items. Identify items where the due date is today or before today. Group the output into Due Today and Overdue / Late. Within each section, separate Tasks and Follow-ups. Sort overdue items by oldest due date first. Sort today's items by priority (urgent first, then high, medium, low), then due date.

Important behavior:
- Do not create new tasks or follow-ups during this routine.
- Do not move items between Tasks and Follow-ups.
- Do not include done/completed items.
- Exclude items with no due date.
- Follow-ups must stay under Follow-ups, not Tasks.`,
  dataSources: ["Tasks", "Follow-ups"],
  outputFormat: `Daily Summary

Due Today

Tasks
- [Task title] — Group: [group] — Status: [status]
  Notes: [brief note]
  Priority: [Priority]

Follow-ups
- [Subject] — Group: [group] — Status: [status]
  Notes: [brief note]
  Priority: [Priority]

Overdue / Late

Tasks
- [Task title] — Due: [date] — Group: [group] — Status: [status]
  Notes: [brief note]
  Priority: [Priority]

Follow-ups
- [Subject] — Due: [date] — Group: [group] — Status: [status]
  Notes: [brief note]
  Priority: [Priority]

If nothing is due or overdue, respond with: "You have no tasks or follow-ups due today or overdue."`,
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

  // Auto-migrate: keep the default routine's content in sync with DEFAULT_ROUTINE
  const defaultRow = rows.find((r) => r.name === DEFAULT_ROUTINE.name);
  if (defaultRow) {
    const instructionsChanged = defaultRow.instructions !== DEFAULT_ROUTINE.instructions;
    const outputFormatChanged = defaultRow.output_format !== DEFAULT_ROUTINE.outputFormat;
    if (instructionsChanged || outputFormatChanged) {
      const now = new Date().toISOString();
      await d1Execute(
        "UPDATE routines SET instructions = ?, output_format = ?, updated_at = ? WHERE id = ?",
        [DEFAULT_ROUTINE.instructions, DEFAULT_ROUTINE.outputFormat, now, defaultRow.id]
      );
      rows = await d1Query<RoutineRow>(
        "SELECT * FROM routines WHERE user_id = ? ORDER BY created_at ASC",
        [user.id]
      );
    }
  }

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
