import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { entries } from "@/db/schema";
import { buildCanonicalExport } from "@/lib/export-utils";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(entries)
      .orderBy(desc(entries.recordedAt));

    const payload = buildCanonicalExport(rows);
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="rechordnlog-export-${dateStamp}.json"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export failed:", err);
    return NextResponse.json(
      { error: "Failed to generate export." },
      { status: 500 }
    );
  }
}
