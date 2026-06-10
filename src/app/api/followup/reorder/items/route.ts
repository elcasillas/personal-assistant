import { NextRequest, NextResponse } from "next/server";
import { d1Execute } from "@/lib/d1";

export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let items: { id: string; order: number }[];
  try {
    const body = await req.json();
    items = body?.items;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ success: true });

  if (items.some((item) => typeof item.id !== "string" || typeof item.order !== "number")) {
    return NextResponse.json({ error: "Each item must have a string id and number order" }, { status: 400 });
  }

  try {
    await Promise.all(
      items.map((item) =>
        d1Execute(
          "UPDATE followup_items SET sort_order = ? WHERE id = ? AND user_id = ?",
          [item.order, item.id, uid]
        )
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[followup/reorder/items] failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
