import { NextResponse } from "next/server";
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
  updated_at: string;
};

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("Authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { cron?: string };
  if (!body.cron) {
    return NextResponse.json({ error: "cron field is required" }, { status: 400 });
  }
  const { cron } = body;

  const userEmail = (process.env.CRON_USER_EMAIL ?? "").toLowerCase();
  const userRows = await d1Query<{ id: string }>(
    "SELECT id FROM users WHERE LOWER(email) = ?",
    [userEmail]
  );
  if (userRows.length === 0) {
    return NextResponse.json({ error: `User not found: ${userEmail}`, ran: 0 }, { status: 404 });
  }
  const userId = userRows[0].id;

  const routines = await d1Query<RoutineRow>(
    `SELECT id, name, instructions, data_sources, output_format, updated_at
     FROM routines
     WHERE user_id = ? AND schedule_enabled = 1 AND schedule_cron = ? AND active = 1`,
    [userId, cron]
  );

  if (routines.length === 0) {
    return NextResponse.json({ ran: 0, message: `No routines scheduled for cron "${cron}"`, cron });
  }

  const results: { routineId: string; routineName: string; status: string; runId?: string }[] = [];

  for (const routine of routines) {
    try {
      const runId = await executeRoutine(routine, userId);
      results.push({ routineId: routine.id, routineName: routine.name, status: "success", runId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[run-scheduled] routine="${routine.name}" error=${msg}`);
      results.push({ routineId: routine.id, routineName: routine.name, status: "failed" });
    }
  }

  return NextResponse.json({ ran: results.length, results, cron });
}

async function executeRoutine(routine: RoutineRow, userId: string): Promise<string> {
  const dataSources = JSON.parse(routine.data_sources || "[]") as string[];
  const now = new Date().toISOString();
  const runId = uuidv4();

  console.log("[run-scheduled] id=%s name=%s updated_at=%s", routine.id, routine.name, routine.updated_at);

  await d1Execute(
    `INSERT INTO routine_runs
       (id, user_id, routine_id, routine_name, output, status, error, started_at, completed_at, created_at, output_format_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [runId, userId, routine.id, routine.name, "", "running", null, now, null, now, routine.output_format]
  );

  let tasks: Record<string, unknown>[] = [];
  let followups: Record<string, unknown>[] = [];

  if (dataSources.includes("Tasks")) {
    tasks = await d1Query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.notes, g.name as group_name
       FROM todo_tasks t LEFT JOIN todo_groups g ON t.group_id = g.id
       WHERE t.user_id = ? AND t.completed = 0 ORDER BY t.due_date ASC`,
      [userId]
    );
  }
  if (dataSources.includes("Follow-ups")) {
    followups = await d1Query(
      `SELECT f.id, f.subject, f.status, f.priority, f.due_date, f.notes, g.name as group_name, f.contact_name
       FROM followup_items f LEFT JOIN followup_groups g ON f.group_id = g.id
       WHERE f.user_id = ? AND f.completed = 0 ORDER BY f.due_date ASC`,
      [userId]
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const dataSection = [
    dataSources.includes("Tasks") ? `TASKS (open, not completed):\n${JSON.stringify(tasks, null, 2)}` : "",
    dataSources.includes("Follow-ups") ? `FOLLOW-UPS (open, not completed):\n${JSON.stringify(followups, null, 2)}` : "",
  ].filter(Boolean).join("\n\n");

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
    defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "Linda" },
  });

  let output = "";
  let finalStatus: "success" | "failed" = "success";
  let errorMsg: string | null = null;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4",
      stream: false,
      messages: [
        {
          role: "system",
          content: "You are Linda, a personal executive assistant. Execute the given routine exactly as instructed. Be concise and professional. Do not create, update, or delete any records.",
        },
        { role: "user", content: userPrompt },
      ],
    });
    output = response.choices[0]?.message?.content ?? "No output generated.";
  } catch (aiErr) {
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
    [completedAt, completedAt, routine.id, userId]
  );

  if (finalStatus === "failed") throw new Error(errorMsg ?? "AI error");
  return runId;
}
