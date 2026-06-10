import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";

export async function GET(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-id") ?? "";
    const rows = await d1Query<{ followup_id: string; cnt: number }>(
      "SELECT followup_id, COUNT(*) AS cnt FROM followup_updates WHERE user_id = ? GROUP BY followup_id",
      [uid]
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.followup_id] = r.cnt;
    return NextResponse.json(counts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
