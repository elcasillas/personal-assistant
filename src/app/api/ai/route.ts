import Anthropic from "@anthropic-ai/sdk";
import { getObject } from "@/lib/r2";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  const [tasks, notes] = await Promise.all([
    getObject("data/tasks.json", []),
    getObject("data/notes.json", []),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (anthropic.messages as any).stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: `You are a personal executive assistant with access to the user's workspace data.

Current Tasks:
${JSON.stringify(tasks, null, 2)}

Recent Notes:
${JSON.stringify(notes, null, 2)}

Help the user with tasks, notes, follow-ups, contacts, and drafts. Be concise and professional.`,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
