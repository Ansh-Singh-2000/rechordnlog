"use client";

import { useMemo } from "react";
import { Camera, Sparkles } from "lucide-react";
import type { Entry } from "@/db/schema";

interface TimelineFeedProps {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  gridMode?: boolean;
}

function formatMonthHeader(localDate: string): string {
  const [yearStr, monthStr] = localDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return localDate;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function TimelineFeed({
  entries,
  onSelectEntry,
  gridMode = false,
}: TimelineFeedProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = entry.localDate.slice(0, 7); // YYYY-MM
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-surface border border-border-subtle p-10 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-elevated border border-border-subtle flex items-center justify-center mb-4">
          <Camera className="w-5 h-5 text-text-muted" />
        </div>
        <h3 className="text-base font-semibold mb-1">No records yet</h3>
        <p className="text-sm text-text-muted max-w-xs mx-auto">
          Tap <span className="text-accent font-medium">Daily Selfie</span> or{" "}
          <span className="text-text-primary font-medium">Log Moment</span>{" "}
          below to capture your first visual entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([monthKey, items]) => (
        <section key={monthKey} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-muted">
              {formatMonthHeader(items[0].localDate)}
            </h2>
            <span className="font-mono text-[11px] text-text-muted">
              {items.length} {items.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div
            className={
              gridMode
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                : "grid grid-cols-1 sm:grid-cols-2 gap-4"
            }
          >
            {items.map((entry) => {
              const isSelfie = entry.type === "selfie";
              const stamp = `${entry.localDate.replace(/-/g, ".")} • ${entry.localTime.slice(0, 5)}`;

              return (
                <article
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="group rounded-2xl bg-surface border border-border-subtle overflow-hidden hover:border-text-muted/50 transition cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[4/5] w-full bg-elevated overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageUrl}
                      alt={entry.caption || `${entry.type} on ${entry.localDate}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.015] transition duration-300"
                    />

                    <div className="absolute top-2.5 left-2.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-white border border-white/10">
                      {isSelfie
                        ? `SELFIE • DAY #${entry.streakDay ?? 1}`
                        : "MOMENT"}
                    </div>

                    {entry.mood && (
                      <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-selfie/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-black">
                        <Sparkles className="w-2.5 h-2.5" />
                        {entry.mood}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-mono text-[11px] text-text-muted mb-1">
                        {stamp} • {entry.timezone}
                      </p>
                      {entry.caption && (
                        <p className="text-sm text-text-primary leading-snug line-clamp-3">
                          {entry.caption}
                        </p>
                      )}
                    </div>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-elevated border border-border-subtle px-2 py-0.5 font-mono text-[10px] text-text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
