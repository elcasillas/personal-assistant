import { NextResponse } from "next/server";
import { d1Query, d1Execute } from "@/lib/d1";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { DAILY_SUMMARY_NAME } from "@/lib/routine-defaults";

export const dynamic = "force-dynamic";

type UserRow = { id: string; name: string; email: string };
type RoutineRow = {
  id: string;
  name: string;
  instructions: string;
  data_sources: string;
  output_format: string;
  updated_at: string;
};

export async function POST(req: Request) {
  try {
    return await runCron(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron] unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runCron(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("Authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = (process.env.CRON_USER_EMAIL ?? "ed.casillas@hostpapa.com").toLowerCase();
  const userRows = await d1Query<UserRow>(
    "SELECT id, name, email FROM users WHERE email = ?",
    [userEmail]
  );
  if (userRows.length === 0) {
    return NextResponse.json({ error: `User not found: ${userEmail}` }, { status: 404 });
  }
  const user = userRows[0];

  // Fetch the routine directly from DB — DB is the source of truth.
  const routineRows = await d1Query<RoutineRow>(
    `SELECT id, name, instructions, data_sources, output_format, updated_at
     FROM routines WHERE user_id = ? AND name = ? AND active = 1`,
    [user.id, DAILY_SUMMARY_NAME]
  );
  if (routineRows.length === 0) {
    return NextResponse.json(
      { error: `Routine not found or inactive: "${DAILY_SUMMARY_NAME}"` },
      { status: 404 }
    );
  }
  const routine = routineRows[0];

  console.log("[cron-run] id=%s name=%s updated_at=%s outputFormat[0:100]=%s",
    routine.id,
    routine.name,
    routine.updated_at,
    routine.output_format.slice(0, 100).replace(/\n/g, "\\n")
  );

  const dataSources = JSON.parse(routine.data_sources || "[]") as string[];
  const now = new Date().toISOString();
  const runId = uuidv4();

  await d1Execute(
    `INSERT INTO routine_runs
       (id, user_id, routine_id, routine_name, output, status, error,
        started_at, completed_at, created_at, output_format_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [runId, user.id, routine.id, routine.name, "", "running", null,
     now, null, now, routine.output_format]
  );

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
    await d1Execute(
      "UPDATE routine_runs SET status = ?, error = ?, completed_at = ? WHERE id = ?",
      ["failed", errMsg, new Date().toISOString(), runId]
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
    defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "Linda" },
  });

  let output: string;
  let finalStatus: "success" | "failed";
  let errorMsg: string | null = null;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4",
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
    [completedAt, completedAt, routine.id, user.id]
  );

  return NextResponse.json(
    { run: { id: runId, status: finalStatus, routineName: routine.name, completedAt } },
    { status: finalStatus === "success" ? 200 : 500 }
  );
}
