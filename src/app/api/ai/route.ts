import OpenAI from "openai";
import { d1Query } from "@/lib/d1";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Linda",
  },
});

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const [tasks, notes] = await Promise.all([
    d1Query("SELECT id, title, status, priority, due_date FROM tasks ORDER BY created_at DESC LIMIT 50"),
    d1Query("SELECT id, title, content, tags FROM notes ORDER BY updated_at DESC LIMIT 20"),
  ]);

  const systemPrompt = `Your name is Linda. You are a personal executive assistant with access to the user's workspace data.

Current Tasks:
${JSON.stringify(tasks, null, 2)}

Recent Notes:
${JSON.stringify(notes, null, 2)}

Help the user with tasks, notes, follow-ups, contacts, and drafts. Be concise and professional.`;

  const stream = await openai.chat.completions.create({
    model: MODEL,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
