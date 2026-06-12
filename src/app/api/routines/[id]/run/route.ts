import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import {
  DAILY_SUMMARY_NAME,
  DAILY_SUMMARY_INSTRUCTIONS,
  DAILY_SUMMARY_OUTPUT_FORMAT,
} from "@/lib/routine-defaults";

export const dynamic = "force-dynamic";

type RoutineRow = {
  id: string;
  name: string;
  instructions: string;
  data_sources: string;
  output_format: string;
  active: number;
};

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
    routineName: row.routine_name,
    output: row.output,
    status: row.status as "running" | "success" | "failed",
    error: row.error ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: routineId } = await params;

  const routineRows = await d1Query<RoutineRow>(
    "SELECT id, name, instructions, data_sources, output_format, active FROM routines WHERE id = ? AND user_id = ?",
    [routineId, user.id]
  );
  if (routineRows.length === 0)
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });

  // Sync default routine content from source-of-truth before running
  const row = routineRows[0];
  if (row.name === DAILY_SUMMARY_NAME) {
    const needsUpdate =
      row.instructions !== DAILY_SUMMARY_INSTRUCTIONS ||
      row.output_format !== DAILY_SUMMARY_OUTPUT_FORMAT;
    if (needsUpdate) {
      const now = new Date().toISOString();
      await d1Execute(
        "UPDATE routines SET instructions = ?, output_format = ?, updated_at = ? WHERE id = ?",
        [DAILY_SUMMARY_INSTRUCTIONS, DAILY_SUMMARY_OUTPUT_FORMAT, now, row.id]
      );
      row.instructions = DAILY_SUMMARY_INSTRUCTIONS;
      row.output_format = DAILY_SUMMARY_OUTPUT_FORMAT;
    }
  }

  const routine = row;
  const dataSources = JSON.parse(routine.data_sources || "[]") as string[];
  const now = new Date().toISOString();
  const runId = uuidv4();

  // Create the run record in "running" state immediately
  await d1Execute(
    `INSERT INTO routine_runs (id, user_id, routine_id, routine_name, output, status, error, started_at, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [runId, user.id, routineId, routine.name, "", "running", null, now, null, now]
  );

  // Fetch data based on data sources
  let tasks: Record<string, unknown>[] = [];
  let followups: Record<string, unknown>[] = [];

  try {
    if (dataSources.includes("Tasks")) {
      tasks = await d1Query(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.notes, g.name as group_name
         FROM todo_tasks t
         LEFT JOIN todo_groups g ON t.group_id = g.id
         WHERE t.user_id = ? AND t.completed = 0
         ORDER BY t.due_date ASC`,
        [user.id]
      );
    }

    if (dataSources.includes("Follow-ups")) {
      followups = await d1Query(
        `SELECT f.id, f.subject, f.status, f.priority, f.due_date, f.notes, g.name as group_name, f.contact_name
         FROM followup_items f
         LEFT JOIN followup_groups g ON f.group_id = g.id
         WHERE f.user_id = ? AND f.completed = 0
         ORDER BY f.due_date ASC`,
        [user.id]
      );
    }
  } catch (fetchErr) {
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const completedAt = new Date().toISOString();
    await d1Execute(
      "UPDATE routine_runs SET status = ?, error = ?, completed_at = ? WHERE id = ?",
      ["failed", errMsg, completedAt, runId]
    );
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const dataSection = [
    dataSources.includes("Tasks")
      ? `TASKS (open, not completed):\n${JSON.stringify(tasks, null, 2)}`
      : "",
    dataSources.includes("Follow-ups")
      ? `FOLLOW-UPS (open, not completed):\n${JSON.stringify(followups, null, 2)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userPrompt = `Today's date: ${today}

ROUTINE: ${routine.name}

INSTRUCTIONS:
${routine.instructions}

OUTPUT FORMAT:
${routine.output_format}

${dataSection}

Execute the routine now and respond in the exact output format specified above.`;

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Linda",
    },
  });
  const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4";

  let output: string;
  let finalStatus: "success" | "failed";
  let errorMsg: string | null = null;

  try {
    const response = await openai.chat.completions.create({
      model,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are Linda, a personal executive assistant. Execute the given routine exactly as instructed. Be concise and professional. Do not create, update, or delete any records.",
        },
        { role: "user", content: userPrompt },
      ],
    });
    output = response.choices[0]?.message?.content ?? "No output generated.";
    finalStatus = "success";
  } catch (aiErr) {
    output = "";
    finalStatus = "failed";
    errorMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
  }

  const completedAt = new Date().toISOString();

  await d1Execute(
    "UPDATE routine_runs SET status = ?, output = ?, error = ?, completed_at = ? WHERE id = ?",
    [finalStatus, output, errorMsg, completedAt, runId]
  );

  await d1Execute(
    "UPDATE routines SET last_run_at = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [completedAt, completedAt, routineId, user.id]
  );

  const runRows = await d1Query<RoutineRunRow>(
    "SELECT * FROM routine_runs WHERE id = ?",
    [runId]
  );

  if (finalStatus === "failed") {
    return NextResponse.json(
      { error: errorMsg, run: parseRun(runRows[0]) },
      { status: 500 }
    );
  }

  return NextResponse.json({ run: parseRun(runRows[0]) });
}

