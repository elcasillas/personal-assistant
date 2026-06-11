import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

type RoutineRow = {
  id: string;
  name: string;
  instructions: string;
  data_sources: string;
  output_format: string;
  active: number;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string;
  group_name: string | null;
};

type FollowupRow = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  due_date: string | null;
  notes: string;
  group_name: string | null;
  contact_name: string;
};

export async function POST(req: Request) {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routineId } = await req.json();
  if (!routineId) return NextResponse.json({ error: "routineId is required" }, { status: 400 });

  const routineRows = await d1Query<RoutineRow>(
    "SELECT id, name, instructions, data_sources, output_format, active FROM routines WHERE id = ? AND user_id = ?",
    [routineId, user.id]
  );
  if (routineRows.length === 0) return NextResponse.json({ error: "Routine not found" }, { status: 404 });

  const routine = routineRows[0];
  const dataSources = JSON.parse(routine.data_sources || "[]") as string[];
  const today = new Date().toISOString().slice(0, 10);

  // Fetch data based on data sources
  let tasks: TaskRow[] = [];
  let followups: FollowupRow[] = [];

  if (dataSources.includes("Tasks")) {
    tasks = await d1Query<TaskRow>(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.notes, g.name as group_name
       FROM todo_tasks t
       LEFT JOIN todo_groups g ON t.group_id = g.id
       WHERE t.user_id = ? AND t.completed = 0
       ORDER BY t.due_date ASC`,
      [user.id]
    );
  }

  if (dataSources.includes("Follow-ups")) {
    followups = await d1Query<FollowupRow>(
      `SELECT f.id, f.subject, f.status, f.priority, f.due_date, f.notes, g.name as group_name, f.contact_name
       FROM followup_items f
       LEFT JOIN followup_groups g ON f.group_id = g.id
       WHERE f.user_id = ? AND f.completed = 0
       ORDER BY f.due_date ASC`,
      [user.id]
    );
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Linda",
    },
  });

  const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4";

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

  let output: string;
  let runStatus: "success" | "error" = "success";
  let runError: string | undefined;

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
  } catch (err) {
    output = "";
    runStatus = "error";
    runError = err instanceof Error ? err.message : String(err);
  }

  // Save run record and update last_run_at
  const runId = uuidv4();
  const now = new Date().toISOString();
  await d1Execute(
    "INSERT INTO routine_runs (id, user_id, routine_id, output, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [runId, user.id, routineId, output, runStatus, runError ?? null, now]
  );
  await d1Execute(
    "UPDATE routines SET last_run_at = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [now, now, routineId, user.id]
  );

  if (runStatus === "error") {
    return NextResponse.json({ error: runError }, { status: 500 });
  }

  return NextResponse.json({ output, runId, lastRunAt: now });
}
