import { NextRequest, NextResponse } from "next/server";
import { d1Batch } from "@/lib/d1";

export async function POST(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-id") ?? "";
    const { items } = await req.json() as { items: { id: string; order: number }[] };
    if (!items?.length) return NextResponse.json({ success: true });
    await d1Batch(
      items.map((item) => ({
        sql: "UPDATE followup_items SET sort_order = ? WHERE id = ? AND user_id = ?",
        params: [item.order, item.id, uid],
      }))
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
