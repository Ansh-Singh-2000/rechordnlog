"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Film } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Entry } from "@/db/schema";

interface SelfieFlipbookProps {
  selfies: Entry[];
  onSelectEntry: (entry: Entry) => void;
}

const FPS_OPTIONS = [2, 4, 8] as const;

export function SelfieFlipbook({
  selfies,
  onSelectEntry,
}: SelfieFlipbookProps) {
  // Sort chronologically oldest -> newest for timelapse playback
  const chronological = useMemo(
    () =>
      [...selfies].sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      ),
    [selfies]
  );

  const [index, setIndex] = useState(
    chronological.length > 0 ? chronological.length - 1 : 0
  );
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState<(typeof FPS_OPTIONS)[number]>(4);

  const safeIndex =
    chronological.length === 0
      ? 0
      : Math.min(index, chronological.length - 1);

  useEffect(() => {
    if (!playing || chronological.length <= 1) return;

    const intervalMs = Math.round(1000 / fps);
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % chronological.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [playing, fps, chronological.length]);

  if (chronological.length === 0) {
    return null;
  }

  const current = chronological[safeIndex] ?? chronological[0];

  return (
    <section className="rounded-2xl bg-surface border border-border-subtle p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-selfie" />
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider">
            Selfie Flipbook
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {FPS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFps(option)}
              className={cn(
                "px-2 py-1 rounded-lg font-mono text-[11px] border transition cursor-pointer",
                fps === option
                  ? "bg-selfie/15 border-selfie text-selfie font-semibold"
                  : "bg-elevated border-border-subtle text-text-muted hover:text-text-primary"
              )}
            >
              {option}fps
            </button>
          ))}
        </div>
      </div>

      {/* Central Frame */}
      <div
        onClick={() => onSelectEntry(current)}
        className="relative mx-auto max-w-sm aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-border-subtle cursor-pointer group"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.imageUrl}
          alt={current.caption || `Selfie day ${current.streakDay ?? index + 1}`}
          className="w-full h-full object-cover"
        />

        <div className="absolute top-3 left-3 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 font-mono text-[11px] text-white border border-white/10">
          DAY #{current.streakDay ?? index + 1} • {current.localDate.replace(/-/g, ".")}
        </div>

        {current.mood && (
          <div className="absolute top-3 right-3 rounded-full bg-selfie/90 px-2.5 py-1 font-mono text-[11px] text-black font-semibold">
            {current.mood}
          </div>
        )}

        {current.caption && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 backdrop-blur-md px-3 py-2 text-xs text-white/95 border border-white/10">
            {current.caption}
          </div>
        )}
      </div>

      {/* Scrubber & Playback */}
      <div className="mt-4 space-y-3 max-w-sm mx-auto">
        <input
          type="range"
          min={0}
          max={Math.max(0, chronological.length - 1)}
          value={safeIndex}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          aria-label="Scrub selfie timeline"
          className="w-full accent-[var(--selfie)] cursor-pointer"
        />

        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-muted">
            Frame {safeIndex + 1} / {chronological.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setIndex(
                  (prev) =>
                    (prev - 1 + chronological.length) % chronological.length
                );
              }}
              aria-label="Previous selfie"
              className="p-2 rounded-xl bg-elevated border border-border-subtle text-text-primary hover:bg-border-subtle/50 transition cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={chronological.length <= 1}
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-selfie text-black font-semibold text-xs px-4 py-2 hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
            >
              {playing ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Play
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setIndex((prev) => (prev + 1) % chronological.length);
              }}
              aria-label="Next selfie"
              className="p-2 rounded-xl bg-elevated border border-border-subtle text-text-primary hover:bg-border-subtle/50 transition cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
