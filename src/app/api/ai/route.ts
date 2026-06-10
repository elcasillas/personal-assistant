import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { d1Query, d1Execute } from "@/lib/d1";

export const dynamic = "force-dynamic";

// ─── Tool definitions ─────────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a new task. You MUST call this whenever the user asks to add, create, or schedule a task. Never confirm task creation with text alone — only confirm after this function returns success.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The task title" },
          status: {
            type: "string",
            enum: ["not_started", "working", "done", "stuck"],
            description:
              'not_started=Not Started, working=Working on it, done=Done, stuck=Stuck. Map user phrases like "working on it" → "working".',
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          dueDate: {
            type: "string",
            description:
              "Due date as YYYY-MM-DD. Compute from relative terms like 'tomorrow' or 'next Monday' using today's date in the system prompt. Omit if no date was mentioned.",
          },
          notes: { type: "string", description: "Optional notes or context" },
        },
        required: ["title", "status", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description:
        "Update an existing task's title, status, priority, due date, or notes. Use the task ID from the task list in context.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID from the task list" },
          title: { type: "string" },
          status: {
            type: "string",
            enum: ["not_started", "working", "done", "stuck"],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          dueDate: {
            type: "string",
            description: "YYYY-MM-DD, or empty string to clear the due date",
          },
          notes: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done / completed.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Permanently delete a task and all its updates.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_followup",
      description:
        'Create a new follow-up item. You MUST call this — never create_task — whenever the user says "in follow-ups", "follow-up", "follow up", "followup", or "follow-up under [name]". Never confirm follow-up creation with text alone — only confirm after this function returns success.',
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The follow-up subject or topic" },
          groupName: {
            type: "string",
            description:
              'The group or person this follow-up belongs to. Extract from "under [name]". If not mentioned, use "Inbox". The group will be auto-created if it does not exist.',
          },
          contactName: {
            type: "string",
            description: "Contact name if explicitly mentioned and different from the group name. Omit if not mentioned.",
          },
          status: {
            type: "string",
            enum: ["not_started", "working", "done", "stuck"],
            description:
              'not_started=Not Started, working=Working on it, done=Done, stuck=Stuck. Map "not working on it" → "not_started", "working on it" → "working".',
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          dueDate: {
            type: "string",
            description:
              "Due date as YYYY-MM-DD. Compute from relative terms using today's date in the system prompt. Omit if no date was mentioned.",
          },
          notes: { type: "string", description: "Optional notes or context" },
        },
        required: ["subject", "groupName", "status", "priority"],
      },
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────

type ToolResult = { success: true; data: unknown } | { success: false; error: string };

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case "create_task": {
        const groups = await d1Query<{ id: string }>(
          "SELECT id FROM todo_groups WHERE user_id = ? ORDER BY sort_order ASC LIMIT 1",
          [userId]
        );
        if (groups.length === 0) {
          return {
            success: false,
            error: "No task groups found. Open the Tasks section to auto-create default groups, then try again.",
          };
        }
        const groupId = groups[0].id;

        const maxRows = await d1Query<{ next_order: number }>(
          "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM todo_tasks WHERE group_id = ? AND user_id = ?",
          [groupId, userId]
        );
        const order = maxRows[0]?.next_order ?? 0;

        const id = uuidv4();
        const now = new Date().toISOString();
        const status = (args.status as string) ?? "not_started";
        const priority = (args.priority as string) ?? "medium";
        const dueDate = (args.dueDate as string) || null;
        const notes = (args.notes as string) ?? "";
        const completed = status === "done" ? 1 : 0;

        await d1Execute(
          `INSERT INTO todo_tasks
             (id, user_id, title, status, priority, due_date, notes, completed, group_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userId, args.title, status, priority, dueDate, notes, completed, groupId, order, now, now]
        );

        return {
          success: true,
          data: { id, title: args.title, status, priority, dueDate, groupId },
        };
      }

      case "update_task": {
        const { id, ...updates } = args;
        const fields = ["updated_at = ?"];
        const params: unknown[] = [new Date().toISOString()];

        if (updates.title !== undefined) { fields.push("title = ?"); params.push(updates.title); }
        if (updates.status !== undefined) {
          fields.push("status = ?"); params.push(updates.status);
          if (updates.status === "done") { fields.push("completed = ?"); params.push(1); }
          else if (updates.status !== undefined) { fields.push("completed = ?"); params.push(0); }
        }
        if (updates.priority !== undefined) { fields.push("priority = ?"); params.push(updates.priority); }
        if ("dueDate" in updates) { fields.push("due_date = ?"); params.push((updates.dueDate as string) || null); }
        if (updates.notes !== undefined) { fields.push("notes = ?"); params.push(updates.notes); }

        params.push(id, userId);
        await d1Execute(
          `UPDATE todo_tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
          params
        );
        return { success: true, data: { id, updated: Object.keys(updates) } };
      }

      case "complete_task": {
        const now = new Date().toISOString();
        await d1Execute(
          "UPDATE todo_tasks SET status = 'done', completed = 1, updated_at = ? WHERE id = ? AND user_id = ?",
          [now, args.id, userId]
        );
        return { success: true, data: { id: args.id, status: "done", completed: true } };
      }

      case "delete_task": {
        await d1Execute(
          "DELETE FROM todo_task_updates WHERE task_id = ? AND user_id = ?",
          [args.id, userId]
        );
        await d1Execute(
          "DELETE FROM todo_tasks WHERE id = ? AND user_id = ?",
          [args.id, userId]
        );
        return { success: true, data: { id: args.id, deleted: true } };
      }

      case "create_followup": {
        const groupName = (args.groupName as string) || "Inbox";

        // Find or create the group
        const existingGroups = await d1Query<{ id: string; name: string }>(
          "SELECT id, name FROM followup_groups WHERE user_id = ? AND LOWER(name) = LOWER(?)",
          [userId, groupName]
        );

        let groupId: string;
        if (existingGroups.length > 0) {
          groupId = existingGroups[0].id;
        } else {
          groupId = uuidv4();
          const maxGroupOrder = await d1Query<{ next_order: number }>(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM followup_groups WHERE user_id = ?",
            [userId]
          );
          const groupOrder = maxGroupOrder[0]?.next_order ?? 0;
          await d1Execute(
            "INSERT INTO followup_groups (id, user_id, name, color, collapsed, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            [groupId, userId, groupName, "#6366f1", 0, groupOrder]
          );
        }

        const maxItemOrder = await d1Query<{ next_order: number }>(
          "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM followup_items WHERE group_id = ? AND user_id = ?",
          [groupId, userId]
        );
        const itemOrder = maxItemOrder[0]?.next_order ?? 0;

        const id = uuidv4();
        const now = new Date().toISOString();
        const status = (args.status as string) ?? "not_started";
        const priority = (args.priority as string) ?? "medium";
        const dueDate = (args.dueDate as string) || null;
        const notes = (args.notes as string) ?? "";
        const contactName = (args.contactName as string) ?? "";
        const completed = status === "done" ? 1 : 0;

        await d1Execute(
          `INSERT INTO followup_items
             (id, user_id, subject, contact_name, status, priority, due_date, notes, completed, group_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userId, args.subject, contactName, status, priority, dueDate, notes, completed, groupId, itemOrder, now, now]
        );

        return {
          success: true,
          data: { id, subject: args.subject, status, priority, dueDate, groupId, groupName },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Route handler ────────────────────────────────────────────

export async function POST(req: Request) {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Linda",
    },
  });

  const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4";
  const { messages } = await req.json();
  const userId = req.headers.get("x-user-id") ?? null;

  const tasksSql = userId
    ? "SELECT id, title, status, priority, due_date FROM todo_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    : "SELECT id, title, status, priority, due_date FROM todo_tasks ORDER BY created_at DESC LIMIT 50";

  const followupGroupsSql = userId
    ? "SELECT id, name FROM followup_groups WHERE user_id = ? ORDER BY sort_order ASC"
    : null;

  const [tasks, notes, followupGroups] = await Promise.all([
    d1Query(tasksSql, userId ? [userId] : []),
    d1Query("SELECT id, title, content, tags FROM notes ORDER BY updated_at DESC LIMIT 20"),
    followupGroupsSql
      ? d1Query<{ id: string; name: string }>(followupGroupsSql, [userId!])
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const systemContent = `Your name is Linda. You are a personal executive assistant.
Today's date: ${today}

ROUTING RULES — follow exactly, no exceptions:
- If the user says "in follow-ups", "follow-up", "follow up", "followup", or "follow-up under [name]" → call create_followup. NEVER call create_task for these requests.
- "under [name]" in a follow-ups request → set groupName to [name].
- If the user says "task", "to-do", "todo", or does not mention follow-ups → call create_task.
- For update / complete / delete requests, match to the correct existing item ID from the lists below.

GENERAL RULES:
- You MUST call the appropriate tool for any create/update/complete/delete action. Never confirm actions with text alone — only confirm after the tool returns success.
- If a tool returns an error, report the exact error to the user.
- Compute relative dates ("tomorrow", "next Monday", "this Friday", etc.) using today's date above and output YYYY-MM-DD.
- Status enum: not_started=Not Started, working=Working on it, done=Done, stuck=Stuck. Map "not working on it" → "not_started".

Current Tasks (use these IDs for update / complete / delete):
${JSON.stringify(tasks, null, 2)}

Current Follow-up Groups (use groupName for create_followup; group is auto-created if missing):
${JSON.stringify(followupGroups.map((g) => g.name), null, 2)}

Recent Notes:
${JSON.stringify(notes, null, 2)}

Be concise and professional.`;

  const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
    role: "system",
    content: systemContent,
  };

  const encoder = new TextEncoder();

  function textStream(text: string) {
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  // ── Phase 1: Non-streaming call to detect tool invocations ──
  const firstResponse = await openai.chat.completions.create({
    model,
    stream: false,
    tools: TOOLS,
    tool_choice: "auto",
    messages: [systemMessage, ...messages],
  });

  const choice = firstResponse.choices[0];
  const assistantMsg = choice.message;

  // No tool calls — return the text directly (still wrapped in a stream for consistency)
  if (choice.finish_reason !== "tool_calls" || !assistantMsg.tool_calls?.length) {
    return textStream(assistantMsg.content ?? "");
  }

  // ── Phase 2: Execute tools ──────────────────────────────────
  if (!userId) {
    return textStream(
      "I can see your request but I'm unable to modify tasks without an authenticated session. Please log in and try again."
    );
  }

  const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = await Promise.all(
    assistantMsg.tool_calls.map(async (tc) => {
      const fnCall = tc as { id: string; function: { name: string; arguments: string } };
      const args = JSON.parse(fnCall.function.arguments) as Record<string, unknown>;
      const result = await executeTool(fnCall.function.name, args, userId);
      return {
        role: "tool" as const,
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      };
    })
  );

  // ── Phase 3: Stream final confirmation with tool results ────
  const finalStream = await openai.chat.completions.create({
    model,
    stream: true,
    messages: [
      systemMessage,
      ...messages,
      {
        role: "assistant" as const,
        content: assistantMsg.content ?? null,
        tool_calls: assistantMsg.tool_calls,
      },
      ...toolResults,
    ],
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of finalStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
