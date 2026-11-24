import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { entries, type Entry } from "@/db/schema";
import { JournalDashboard } from "@/components/JournalDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialEntries: Entry[] = [];
  let dbError: string | null = null;

  try {
    const db = getDb();
    initialEntries = await db
      .select()
      .from(entries)
      .orderBy(desc(entries.recordedAt));
  } catch (err) {
    console.error("Failed to load entries on server:", err);
    dbError =
      "Database not connected yet. Configure DATABASE_URL and run `npx drizzle-kit push` to start logging.";
  }

  return <JournalDashboard initialEntries={initialEntries} dbError={dbError} />;
}
