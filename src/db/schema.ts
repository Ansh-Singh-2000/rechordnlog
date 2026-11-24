import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export interface EntryMetadata {
  width?: number;
  height?: number;
  fileSizeKB?: number;
  originalSizeKB?: number;
  mimeType?: string;
  originalFileTimestamp?: string | null;
  device?: string;
}

export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type", { enum: ["selfie", "moment"] }).notNull(),
  imageUrl: text("image_url").notNull(),
  blobPathname: text("blob_pathname").notNull(),
  caption: text("caption").default(""),
  mood: text("mood"),
  tags: jsonb("tags").$type<string[]>().default([]),
  streakDay: integer("streak_day"),
  localDate: text("local_date").notNull(), // YYYY-MM-DD
  localTime: text("local_time").notNull(), // HH:mm:ss
  timezone: text("timezone").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata").$type<EntryMetadata>().default({}),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
