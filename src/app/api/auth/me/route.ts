import { NextRequest, NextResponse } from "next/server";
import { getSessionFromHeaders } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getSessionFromHeaders(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(user);
}
