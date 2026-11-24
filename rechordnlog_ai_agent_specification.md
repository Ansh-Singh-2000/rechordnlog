# Project Specification: `rechordnlog`

> **Instructions for AI Agent:** You are building **rechordnlog**, a fast, tactile, mobile-first personal visual journal and event-logging web application built with Next.js (App Router) and hosted on Vercel. Follow every architectural, UI/UX, and data-portability specification in this document strictly. Prioritize clean code, minimal dependencies, mobile camera ergonomics, and zero-friction deployment.

---

## 1. Project Overview & Core Philosophy

* **App Name:** `rechordnlog` (always styled in lowercase monospace/sans-serif)
* **Purpose:** A private, single-user web app to capture two types of daily visual records:
  1. **Daily Selfie:** A quick, front-camera daily portrait with automatic timestamping, streak tracking, and optional 1-tap mood tags.
  2. **Moment / Event Log:** A photo (captured via camera or uploaded from the device gallery) paired with a written caption, tags, and rich metadata.
* **Core Philosophy:**
  * **Sub-5-Second Capture:** Opening the app on a phone should immediately offer tactile triggers to snap a selfie or log a moment.
  * **Zero Vendor Lock-In:** All entries are stored in a clean relational schema and can be exported in 1 click as a structured JSON/CSV/ZIP bundle complete with integration instructions.
  * **Vercel-Native Simplicity:** Uses Vercel's built-in storage ecosystem so the owner needs zero complex third-party infrastructure.

---

## 2. Recommended Tech Stack (Fastest Vercel Setup)

Use the following modern, lightweight stack:

* **Framework:** Next.js 15+ (App Router, TypeScript, Server Actions & Route Handlers)
* **Styling:** Tailwind CSS + `lucide-react` (icons) + `clsx` / `tailwind-merge`
* **Database:** **Neon Postgres** (provisioned directly via Vercel Storage) + **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`)
* **Photo Storage:** **Vercel Blob** (`@vercel/blob`)
  * *Why:* 1-click setup inside the Vercel dashboard, instant global CDN URLs, generous free tier for personal use.
  * *Optimization:* Use `browser-image-compression` on the client before uploading to resize images to max `1600px` width/height at `0.82` WebP/JPEG quality (~250KB–450KB per photo). This ensures instant mobile uploads and keeps storage usage tiny for years.
* **Authentication (Personal Gate):** Lightweight Passcode Lock (`APP_PASSCODE` environment variable + HTTP-only signed cookie via `jose`). Since the app is hosted publicly on Vercel for personal use, this prevents unauthorized visitors from viewing or uploading entries without needing Clerk/Auth0.
* **Export Utilities:** `jszip` (for bundling JSON, CSV, and a generated integration README into a single `.zip` download).
* **PWA Support:** Include `public/manifest.json` and mobile viewport meta tags so the user can tap **"Add to Home Screen"** on iOS/Android and use `rechordnlog` like a native camera app.

---

## 3. UI/UX & Design System ("Tactile Analog-Digital Journal")

Design the interface to feel like a blend of a **warm editorial journal** (Day One) and a **precision pocket camera** (Teenage Engineering).

### 3.1 Color Palette

Support both **Dark Mode (Default—optimized for camera capture)** and **Light Mode** via Tailwind `dark:` classes:

| Token | Light Mode ("Warm Paper") | Dark Mode ("Obsidian Studio") | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | `#FAF9F6` | `#111110` | Main app canvas |
| **Surface / Card** | `#FFFFFF` | `#1B1B19` | Entry cards, modals, drawers |
| **Elevated Surface** | `#F3F1ED` | `#262623` | Filter pills, input backgrounds |
| **Border Subtle** | `#E6E3DC` | `#2E2E2A` | 1px hairline card & divider borders |
| **Text Primary** | `#18181B` | `#F4F4F2` | Captions, headings |
| **Text Muted** | `#71717A` | `#9E9E98` | Dates, EXIF stamps, placeholders |
| **Primary Accent** | `#E05A47` | `#F06A57` | Shutter button, primary CTAs (Terracotta Coral) |
| **Selfie Badge Accent** | `#0D9488` | `#2DD4BF` | Daily Selfie streak & verification pills (Teal) |

### 3.2 Typography

* **Primary UI & Captions:** `Plus Jakarta Sans` (clean, warm geometric sans-serif)
* **Metadata, Timestamps & Brand:** `JetBrains Mono` (used for `rechordnlog` logo, `YYYY.MM.DD • HH:MM` timestamps, streak counters, and JSON preview)

### 3.3 Layout & Mobile-First Ergonomics

1. **Sticky Minimal Header:**
   * Left: `rechordnlog` wordmark with a small glowing status dot (`#F06A57`).
   * Center/Right: Daily Selfie status badge (`Selfie: Done ✓` in teal, or `Selfie: Pending` clickable trigger) + **Export / Data** button + Theme toggle.
2. **Navigation & View Switcher:**
   * Segmented control bar directly beneath the header:
     * `All Entries` (Chronological mixed feed)
     * `Daily Selfies` (Grid + Interactive **Flipbook / Timelapse Player** to scrub through daily selfies over time)
     * `Moments` (Caption-focused event feed)
3. **Feed Cards:**
   * Clean rounded-2xl cards (`16px` radius) with `1px` hairline border.
   * Image displayed in an aspect-friendly frame (`4:5` or natural aspect ratio with rounded corners).
   * Top-left subtle glassmorphic pill on photo: `SELFIE • DAY #42` or `MOMENT`.
   * Below photo: Monospaced metadata line (`2026.11.25 • 09:14 AM • IST`), followed by the user's caption (if any) and subtle pill tags.
4. **Floating Bottom Action Dock (Thumb-Zone Optimized):**
   * Fixed at the bottom center with backdrop blur (`backdrop-blur-md`):
     * **Button 1 (Primary):** `[Camera Icon] Daily Selfie` (Launches instant front-camera modal)
     * **Button 2 (Secondary):** `[Plus / Image Icon] Log Moment` (Launches photo capture / gallery picker + caption composer)

---

## 4. Core Features & Functional Requirements

### Feature 1: Daily Selfie Capture (`/components/SelfieModal.tsx`)
* **Camera Interface:**
  * Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })`.
  * Displays a **horizontally mirrored** live video preview (`scale-x-[-1]`) so it feels natural like a mirror, and flips the canvas back upon capture so text/background isn't backwards (or provides a mirror toggle).
  * Includes a subtle framing guide overlay and a fallback `<input type="file" accept="image/*" capture="user" />` if camera permissions are blocked.
* **Post-Capture Confirmation:**
  * Preview captured selfie + **Retake** button.
  * Optional 1-tap mood selector pills: `Calm`, `Energized`, `Focused`, `Tired`, `Grateful`, `Chaos` (no typing required so logging takes < 5 seconds).
  * Optional 1-line quick note.
  * Automatically computes `localDate` (`YYYY-MM-DD`) and increments the user's `streakDay` count.

### Feature 2: Moment / Event Logger (`/components/MomentModal.tsx`)
* **Input Modes:**
  * **Take Photo:** Opens rear camera (`facingMode: "environment"`) or native mobile camera capture.
  * **Upload from Gallery:** Standard file picker (`accept="image/*"`).
* **Metadata Extraction:**
  * Automatically captures:
    * `capturedAt` (ISO timestamp)
    * `localDate` (`YYYY-MM-DD`) & `localTime` (`HH:mm:ss`)
    * `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
    * `fileLastModified` (from the uploaded `File` object, helpful when uploading an older gallery photo—allow the user to toggle between *"Use Photo's Original Date"* or *"Use Current Time"*).
    * `deviceInfo` (basic browser/OS string)
* **Caption & Tags:**
  * Auto-expanding clean textarea for writing the story/context of the moment.
  * Optional tag input (e.g., `#travel`, `#food`, `#milestone`).

### Feature 3: Viewer, Timeline & Selfie Flipbook (`/components/TimelineFeed.tsx` & `/components/SelfieFlipbook.tsx`)
* **Timeline View:** Infinite-scroll or paginated feed grouped by Month/Year headers, with search by caption/tag and filter by entry type (`all`, `selfie`, `moment`).
* **Selfie Flipbook / Timelapse Mode:**
  * Accessible from the `Daily Selfies` tab.
  * Displays a central frame with a **Play / Pause** button (cycles through selfies at 2fps, 4fps, or 8fps) and a **manual range scrubber slider** to watch daily changes over weeks/months.
* **Entry Inspector Modal:**
  * Clicking any card opens a detail sheet showing the full-resolution image, full JSON metadata block, edit caption capability, and a **Delete Entry** button (which deletes both the Postgres row and the Vercel Blob file).

---

## 5. Database Schema & Portable Data Architecture

### 5.1 Drizzle Postgres Schema (`src/db/schema.ts`)

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type', { enum: ['selfie', 'moment'] }).notNull(),
  imageUrl: text('image_url').notNull(),
  blobPathname: text('blob_pathname').notNull(),
  caption: text('caption').default(''),
  mood: text('mood'), // Primarily for daily selfies
  tags: jsonb('tags').$type<string[]>().default([]),
  streakDay: integer('streak_day'), // Sequential day number for selfies
  localDate: text('local_date').notNull(), // Format: YYYY-MM-DD
  localTime: text('local_time').notNull(), // Format: HH:mm:ss
  timezone: text('timezone').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').$type<{
    width?: number;
    height?: number;
    fileSizeKB?: number;
    mimeType?: string;
    originalFileTimestamp?: string | null;
    device?: string;
  }>().default({}),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
```

### 5.2 Portable Export Schema & Integration Hub (`/components/ExportModal.tsx` & `/api/export`)

The user specifically requires data to be stored and exported in a clean, self-documenting format that can be integrated into any external app, static site, Notion database, or personal analytics pipeline.

1. **Canonical Export JSON Format (`rechordnlog-export-v1.json`):**
   ```json
   {
     "$schema": "https://rechordnlog.local/schemas/export-v1.json",
     "app": "rechordnlog",
     "version": "1.0.0",
     "exportedAt": "2026-11-25T18:30:00.000Z",
     "summary": {
       "totalEntries": 142,
       "totalSelfies": 98,
       "totalMoments": 44,
       "dateRange": {
         "firstEntry": "2026-08-19",
         "latestEntry": "2026-11-25"
       }
     },
     "entries": [
       {
         "id": "550e8400-e29b-41d4-a716-446655440000",
         "type": "selfie",
         "localDate": "2026-11-25",
         "localTime": "08:45:12",
         "timezone": "Asia/Kolkata",
         "recordedAt": "2026-11-25T03:15:12.000Z",
         "streakDay": 98,
         "mood": "Focused",
         "caption": "Morning coffee before deep work.",
         "tags": ["morning"],
         "media": {
           "url": "https://xyz.public.blob.vercel-storage.com/selfies/2026-11-25-abc.webp",
           "localAssetPath": "media/2026-11-25_selfie_550e8400.webp",
           "mimeType": "image/webp",
           "dimensions": { "width": 1080, "height": 1350 }
         },
         "device": "iPhone / Safari"
       }
     ]
   }
   ```

2. **Export & Integration Modal Features:**
   * **Download Clean JSON:** Instant download of `rechordnlog-export-YYYY-MM-DD.json`.
   * **Download CSV:** Flat tabular export for spreadsheets/Notion.
   * **Download Full Portable ZIP Bundle:** Uses `jszip` to package:
     * `rechordnlog-data.json`
     * `rechordnlog-data.csv`
     * `INTEGRATION_GUIDE.md` (An auto-generated markdown guide inside the ZIP explaining the JSON schema, how to host/migrate the images, and copy-pasteable TypeScript, Python, and Next.js snippets to parse and render the archive in another project).
   * **In-App Integration Preview Tab:** Inside the Export modal, include a **"Developer / Integration"** tab displaying the live JSON schema and copyable code snippets so the user can see how to consume their data anywhere at a glance.

---

## 6. API Routes & Server Actions

Implement clean, type-safe endpoints under `src/app/api/`:

1. `POST /api/auth` & `DELETE /api/auth`
   * Validates `passcode` against `process.env.APP_PASSCODE`. Sets/clears an `HttpOnly`, `Secure`, `SameSite=Lax` JWT cookie valid for 30 days.
2. `POST /api/upload`
   * Protected by auth middleware. Accepts `multipart/form-data` with the compressed image file and `folder` (`selfies` or `moments`). Uploads to Vercel Blob via `put()` and returns `{ url, pathname }`.
3. `GET /api/entries` & `POST /api/entries`
   * `GET`: Fetches entries ordered by `recordedAt DESC`, supporting query params `?type=selfie|moment&q=searchTerm`.
   * `POST`: Validates payload, calculates `streakDay` (if `type === 'selfie'`), and inserts into Neon Postgres via Drizzle.
4. `PATCH /api/entries/[id]` & `DELETE /api/entries/[id]`
   * `PATCH`: Updates `caption`, `mood`, or `tags`.
   * `DELETE`: Deletes the image from Vercel Blob (`del(entry.blobPathname)`) and deletes the DB row.
5. `GET /api/export`
   * Returns the complete canonical `rechordnlog-export-v1.json` payload with proper `Content-Disposition` headers.

---

## 7. Step-by-Step Build Order for the AI Agent

Execute the build in these exact phases to ensure zero broken dependencies:

1. **Phase 1 — Scaffold & Design System:**
   * Initialize Next.js (TypeScript, Tailwind CSS, App Router) and configure `Plus Jakarta Sans` + `JetBrains Mono` in `src/app/layout.tsx`.
   * Configure dark/light mode CSS variables matching Section 3.1 and add `public/manifest.json` for PWA support.
2. **Phase 2 — Database & Passcode Auth:**
   * Set up Drizzle ORM (`src/db/index.ts` and `src/db/schema.ts`) and create `drizzle.config.ts`.
   * Implement `src/middleware.ts` and a sleek minimal Passcode Lock screen (`src/app/unlock/page.tsx`) so all routes and APIs are private.
3. **Phase 3 — Image Compression & Upload Pipeline:**
   * Build `src/lib/image-utils.ts` wrapping `browser-image-compression` + EXIF/dimension extraction.
   * Implement `/api/upload` using `@vercel/blob`.
4. **Phase 4 — Capture Modals (Selfie & Moment):**
   * Build `SelfieModal.tsx` (WebRTC front camera + mirror preview + mood pills + 1-tap save).
   * Build `MomentModal.tsx` (rear camera / gallery upload + original timestamp toggle + caption & tags).
5. **Phase 5 — Timeline Feed, Selfie Flipbook & Export Hub:**
   * Build the main dashboard (`src/app/page.tsx`) with `All Entries`, `Daily Selfies` (including the interactive `SelfieFlipbook` player), and `Moments` views.
   * Build `ExportModal.tsx` with 1-click JSON, CSV, and full ZIP + `INTEGRATION_GUIDE.md` generator.

---

## 8. Environment Variables & Vercel Deployment Checklist

Create a `.env.example` file with these exact keys:

```env
# Database (Auto-populated when connecting Neon Postgres in Vercel Storage)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Blob Storage (Auto-populated when connecting Vercel Blob in Vercel Storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Personal Security Lock
APP_PASSCODE="choose-a-strong-personal-pin-or-password"
JWT_SECRET="generate-a-random-32-char-secret-key"
```

### Quick 4-Step Deployment Guide (Include in project `README.md`):
1. Push repository to GitHub and import into **Vercel**.
2. In the Vercel Project Dashboard, open the **Storage** tab and connect:
   * **Neon Postgres** (or Vercel Postgres)
   * **Vercel Blob**
3. Add `APP_PASSCODE` and `JWT_SECRET` in **Settings → Environment Variables**.
4. Run `npx drizzle-kit push` once (or configure it in the build command) and open the deployed URL on your phone to add it to your Home Screen.