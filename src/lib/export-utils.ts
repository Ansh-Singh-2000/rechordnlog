import type { Entry } from "@/db/schema";

export interface CanonicalExportEntry {
  id: string;
  type: "selfie" | "moment";
  localDate: string;
  localTime: string;
  timezone: string;
  recordedAt: string;
  streakDay: number | null;
  mood: string | null;
  caption: string;
  tags: string[];
  media: {
    url: string;
    localAssetPath: string;
    mimeType: string;
    dimensions: {
      width: number | null;
      height: number | null;
    };
    fileSizeKB?: number;
  };
  device: string;
}

export interface CanonicalExportPayload {
  $schema: string;
  app: "rechordnlog";
  version: "1.0.0";
  exportedAt: string;
  summary: {
    totalEntries: number;
    totalSelfies: number;
    totalMoments: number;
    dateRange: {
      firstEntry: string | null;
      latestEntry: string | null;
    };
  };
  entries: CanonicalExportEntry[];
}

function extensionFromEntry(entry: Entry): string {
  const mime = entry.metadata?.mimeType;
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  const pathnameExt = entry.blobPathname.split(".").pop()?.toLowerCase();
  return pathnameExt || "webp";
}

export function buildCanonicalExport(rows: Entry[]): CanonicalExportPayload {
  const sortedAsc = [...rows].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const selfies = rows.filter((r) => r.type === "selfie");
  const moments = rows.filter((r) => r.type === "moment");

  const mapped: CanonicalExportEntry[] = rows.map((entry) => {
    const ext = extensionFromEntry(entry);
    const shortId = entry.id.slice(0, 8);
    return {
      id: entry.id,
      type: entry.type,
      localDate: entry.localDate,
      localTime: entry.localTime,
      timezone: entry.timezone,
      recordedAt: new Date(entry.recordedAt).toISOString(),
      streakDay: entry.streakDay ?? null,
      mood: entry.mood ?? null,
      caption: entry.caption ?? "",
      tags: entry.tags ?? [],
      media: {
        url: entry.imageUrl,
        localAssetPath: `media/${entry.localDate}_${entry.type}_${shortId}.${ext}`,
        mimeType: entry.metadata?.mimeType || "image/webp",
        dimensions: {
          width: entry.metadata?.width ?? null,
          height: entry.metadata?.height ?? null,
        },
        fileSizeKB: entry.metadata?.fileSizeKB,
      },
      device: entry.metadata?.device || "Unknown",
    };
  });

  return {
    $schema: "https://rechordnlog.local/schemas/export-v1.json",
    app: "rechordnlog",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    summary: {
      totalEntries: rows.length,
      totalSelfies: selfies.length,
      totalMoments: moments.length,
      dateRange: {
        firstEntry: sortedAsc[0]?.localDate ?? null,
        latestEntry: sortedAsc[sortedAsc.length - 1]?.localDate ?? null,
      },
    },
    entries: mapped,
  };
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvExport(payload: CanonicalExportPayload): string {
  const headers = [
    "id",
    "type",
    "localDate",
    "localTime",
    "timezone",
    "recordedAt",
    "streakDay",
    "mood",
    "caption",
    "tags",
    "imageUrl",
    "localAssetPath",
    "mimeType",
    "width",
    "height",
    "fileSizeKB",
    "device",
  ];

  const lines = [headers.join(",")];

  for (const item of payload.entries) {
    const row = [
      item.id,
      item.type,
      item.localDate,
      item.localTime,
      item.timezone,
      item.recordedAt,
      item.streakDay !== null ? String(item.streakDay) : "",
      item.mood ?? "",
      item.caption,
      item.tags.join("|"),
      item.media.url,
      item.media.localAssetPath,
      item.media.mimeType,
      item.media.dimensions.width !== null ? String(item.media.dimensions.width) : "",
      item.media.dimensions.height !== null ? String(item.media.dimensions.height) : "",
      item.media.fileSizeKB !== undefined ? String(item.media.fileSizeKB) : "",
      item.device,
    ].map(escapeCsvCell);

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export function buildIntegrationGuide(payload: CanonicalExportPayload): string {
  return `# rechordnlog Export & Integration Guide

Exported At: \`${payload.exportedAt}\`
Total Entries: **${payload.summary.totalEntries}** (${payload.summary.totalSelfies} selfies, ${payload.summary.totalMoments} moments)
Date Range: \`${payload.summary.dateRange.firstEntry ?? "N/A"}\` → \`${payload.summary.dateRange.latestEntry ?? "N/A"}\`

---

## Bundle Contents

- \`rechordnlog-data.json\` — Canonical v1.0.0 JSON archive with summary metadata and typed entries.
- \`rechordnlog-data.csv\` — Flat tabular export suitable for Excel, Google Sheets, or Notion import.
- \`INTEGRATION_GUIDE.md\` — This documentation file.

---

## Migrating or Hosting Images

Each entry includes both \`media.url\` (the current Vercel Blob CDN URL) and a deterministic \`media.localAssetPath\` (e.g. \`media/2026-11-25_selfie_550e8400.webp\`).
To back up all images locally from \`rechordnlog-data.json\`, run the Python script below.

---

## Code Snippets

### TypeScript / Next.js

\`\`\`ts
import archive from "./rechordnlog-data.json";

const selfies = archive.entries.filter((e) => e.type === "selfie");
console.log(\`Loaded \${selfies.length} daily selfies\`);
\`\`\`

### Python (Download Media & Analyze)

\`\`\`python
import json
import os
import urllib.request

with open("rechordnlog-data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

os.makedirs("media", exist_ok=True)
for entry in data["entries"]:
    dest = entry["localAssetPath"] if "localAssetPath" in entry else entry["media"]["localAssetPath"]
    url = entry["media"]["url"]
    if not os.path.exists(dest):
        urllib.request.urlretrieve(url, dest)
        print(f"Downloaded {dest}")
\`\`\`
`;
}

export const INTEGRATION_SNIPPETS = {
  typescript: `import type { CanonicalExportPayload } from "@/lib/export-utils";

export async function loadArchive(url: string) {
  const res = await fetch(url);
  const data = (await res.json()) as CanonicalExportPayload;
  const selfies = data.entries.filter((e) => e.type === "selfie");
  return { summary: data.summary, selfies };
}`,
  python: `import json, os, urllib.request

with open("rechordnlog-data.json", "r", encoding="utf-8") as f:
    archive = json.load(f)

os.makedirs("media", exist_ok=True)
for entry in archive["entries"]:
    dest = entry["media"]["localAssetPath"]
    if not os.path.exists(dest):
        urllib.request.urlretrieve(entry["media"]["url"], dest)`,
};
