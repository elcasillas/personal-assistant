import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/auth";
import { d1Query } from "@/lib/d1";
import { generateInitials, getAvatarColor } from "@/lib/todo-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionFromHeaders(await headers());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await d1Query<{ id: string; name: string }>(
    "SELECT id, name FROM users ORDER BY name ASC",
    []
  );

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      initials: generateInitials(u.name),
      color: getAvatarColor(u.name),
    }))
  );
}
