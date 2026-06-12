import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const DEFAULT_ROUTINE = {
  name: "Daily Due and Overdue Summary",
  description: "Executive-friendly daily summary of Tasks and Follow-ups due today or overdue.",
  triggerPhrases: [
    "What's due today?",
    "Summarize my tasks and follow-ups",
    "What is late?",
    "Give me my daily summary",
    "What do I need to follow up on today?",
    "Daily action summary",
  ],
  instructions: `Generate an executive-friendly daily summary of all Tasks and Follow-ups that are due today or overdue.

STEP 1 — FILTER ITEMS:
- Include only items where due_date equals today OR due_date is before today.
- Exclude items with no due date.
- Items marked completed/done go into the "Completed or No-Action Items" section only — do not list them under Due Today or Overdue.

STEP 2 — FOR EACH ITEM, GENERATE:
- A concise 1–3 sentence executive summary rewritten from the notes field. If notes are empty or unclear, write: "Next step needs clarification."
- A clear recommended next step written as a direct actionable recommendation.
- For overdue items: calculate days overdue based on today's date.

STEP 3 — SORT ORDER:
- Overdue: sort by oldest due date first.
- Due Today: sort by priority (urgent → high → medium → low), then by due date.
- High-Priority Action Items: include only urgent or high priority items from both sections.

STEP 4 — BUILD THE SUGGESTED DAILY ACTION PLAN:
- Short prioritized bullet list based on what you found.

IMPORTANT RULES:
- Do not create, edit, or delete any tasks or follow-ups.
- Follow-ups must stay under Follow-ups. Do not reclassify them as Tasks.
- Do not include empty fields.
- Keep tone professional and executive-friendly.
- Do not output long unbroken paragraphs — use the structured format below.
- If there are no due or overdue items, respond with: "There are no due or overdue items for today."`,
  dataSources: ["Tasks", "Follow-ups"],
  outputFormat: `Daily Due and Overdue Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY
[Write a short paragraph covering: total items due today, total overdue, number of high-priority items, and any items that appear urgent or blocked. Example: "You have 8 open items requiring attention today: 5 due today and 3 overdue. Of these, 4 are high priority. The most urgent items appear to be [Title A], [Title B], and [Title C]."]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DUE TODAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks

[Task Title]
  Group: [Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

Follow-ups

[Follow-up Subject]
  Contact / Group: [Contact or Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERDUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks

[Task Title]
  Group: [Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]
  Days Overdue: [Number]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

Follow-ups

[Follow-up Subject]
  Contact / Group: [Contact or Group Name]
  Status: [Status]
  Priority: [Priority]
  Due Date: [Due Date]
  Days Overdue: [Number]

  Summary:
  [1–3 sentence executive summary based on notes]

  Recommended Next Step:
  [Clear, actionable next step]

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH-PRIORITY ACTION ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Title] — [Task or Follow-up] — Due: [Date]
Action: [Recommended next step]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETED OR NO-ACTION ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Title] — Completed
Notes: [Short summary if relevant]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTED DAILY ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Provide a short prioritized bullet list for the day based on what was found. Example:
• Address overdue high-priority items first.
• Follow up on any blocked or waiting items.
• Review due-today medium-priority items.
• Close or archive completed items if no further action is required.]`,
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
