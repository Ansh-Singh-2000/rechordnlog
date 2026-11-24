import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { entries } from "@/db/schema";

interface PatchBody {
  caption?: string;
  mood?: string | null;
  tags?: string[];
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const body = (await request.json()) as PatchBody;

    const updates: Partial<typeof entries.$inferInsert> = {};
    if (typeof body.caption === "string") {
      updates.caption = body.caption.trim();
    }
    if (body.mood !== undefined) {
      updates.mood = body.mood;
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const [updated] = await db
      .update(entries)
      .set(updates)
      .where(eq(entries.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    return NextResponse.json({ entry: updated });
  } catch (err) {
    console.error("PATCH /api/entries/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update entry." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const [existing] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    // Delete from Vercel Blob if configured
    if (process.env.BLOB_READ_WRITE_TOKEN && existing.blobPathname) {
      try {
        await del(existing.blobPathname);
      } catch (blobErr) {
        console.warn("Vercel Blob deletion warning:", blobErr);
      }
    }

    await db.delete(entries).where(eq(entries.id, id));

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("DELETE /api/entries/[id] failed:", err);
    return NextResponse.json({ error: "Failed to delete entry." }, { status: 500 });
  }
}
