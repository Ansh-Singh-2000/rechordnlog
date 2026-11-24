import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { entries, type EntryMetadata } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const queryParam = searchParams.get("q")?.trim();

    const conditions = [];

    if (typeParam === "selfie" || typeParam === "moment") {
      conditions.push(eq(entries.type, typeParam));
    }

    if (queryParam) {
      const pattern = `%${queryParam}%`;
      conditions.push(
        or(
          ilike(entries.caption, pattern),
          ilike(entries.mood, pattern),
          sql`${entries.tags}::text ILIKE ${pattern}`
        )
      );
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(entries)
            .where(and(...conditions))
            .orderBy(desc(entries.recordedAt))
        : await db.select().from(entries).orderBy(desc(entries.recordedAt));

    return NextResponse.json({ entries: rows });
  } catch (err) {
    console.error("GET /api/entries failed:", err);
    return NextResponse.json(
      { error: "Failed to load entries." },
      { status: 500 }
    );
  }
}

interface CreateEntryBody {
  type: "selfie" | "moment";
  imageUrl: string;
  blobPathname: string;
  caption?: string;
  mood?: string | null;
  tags?: string[];
  localDate: string;
  localTime: string;
  timezone: string;
  recordedAt?: string;
  metadata?: EntryMetadata;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = (await request.json()) as CreateEntryBody;

    if (body.type !== "selfie" && body.type !== "moment") {
      return NextResponse.json({ error: "Invalid entry type." }, { status: 400 });
    }
    if (!body.imageUrl || !body.blobPathname || !body.localDate || !body.localTime || !body.timezone) {
      return NextResponse.json(
        { error: "Missing required entry fields." },
        { status: 400 }
      );
    }

    let streakDay: number | null = null;

    if (body.type === "selfie") {
      // Check latest selfie to compute streakDay
      const latestSelfies = await db
        .select({
          localDate: entries.localDate,
          streakDay: entries.streakDay,
        })
        .from(entries)
        .where(eq(entries.type, "selfie"))
        .orderBy(desc(entries.localDate), desc(entries.recordedAt))
        .limit(1);

      if (latestSelfies.length === 0) {
        streakDay = 1;
      } else {
        const last = latestSelfies[0];
        if (last.localDate === body.localDate) {
          // Same day: keep the current day's streak number
          streakDay = last.streakDay ?? 1;
        } else {
          // Check if consecutive day (yesterday -> today) or general sequential count
          const lastDate = new Date(`${last.localDate}T00:00:00Z`);
          const currDate = new Date(`${body.localDate}T00:00:00Z`);
          const diffDays = Math.round(
            (currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 1) {
            streakDay = (last.streakDay ?? 0) + 1;
          } else if (diffDays > 1) {
            streakDay = 1;
          } else {
            // Backdated selfie: increment from total count or keep 1
            streakDay = (last.streakDay ?? 0) + 1;
          }
        }
      }
    }

    const cleanTags = Array.isArray(body.tags)
      ? body.tags
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean)
      : [];

    const recordedAtDate = body.recordedAt ? new Date(body.recordedAt) : new Date();

    const [created] = await db
      .insert(entries)
      .values({
        type: body.type,
        imageUrl: body.imageUrl,
        blobPathname: body.blobPathname,
        caption: body.caption?.trim() ?? "",
        mood: body.mood ?? null,
        tags: cleanTags,
        streakDay,
        localDate: body.localDate,
        localTime: body.localTime,
        timezone: body.timezone,
        recordedAt: Number.isNaN(recordedAtDate.getTime()) ? new Date() : recordedAtDate,
        metadata: body.metadata ?? {},
      })
      .returning();

    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/entries failed:", err);
    return NextResponse.json(
      { error: "Failed to save entry." },
      { status: 500 }
    );
  }
}
