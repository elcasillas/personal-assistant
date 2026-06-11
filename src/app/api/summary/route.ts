import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query } from "@/lib/d1";

export const dynamic = "force-dynamic";

type CountRow = { count: number };

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    tasksOpen,
    followupsOpen,
    notesActive,
    draftsTotal,
    contactsTotal,
    routinesActive,
  ] = await Promise.all([
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM todo_tasks WHERE user_id = ? AND completed = 0",
      [user.id]
    ),
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM followup_items WHERE user_id = ? AND completed = 0",
      [user.id]
    ),
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM notes WHERE archived = 0"
    ),
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM drafts"
    ),
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM contacts"
    ),
    d1Query<CountRow>(
      "SELECT COUNT(*) as count FROM routines WHERE user_id = ? AND active = 1",
      [user.id]
    ),
  ]);

  return NextResponse.json({
    tasks:     { open: tasksOpen[0]?.count ?? 0 },
    followups: { open: followupsOpen[0]?.count ?? 0 },
    notes:     { active: notesActive[0]?.count ?? 0 },
    drafts:    { total: draftsTotal[0]?.count ?? 0 },
    contacts:  { total: contactsTotal[0]?.count ?? 0 },
    routines:  { active: routinesActive[0]?.count ?? 0 },
  });
}
