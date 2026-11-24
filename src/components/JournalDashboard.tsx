"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ImagePlus,
  Download,
  Sun,
  Moon,
  Search,
  Check,
  Lock,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SelfieModal } from "@/components/SelfieModal";
import { MomentModal } from "@/components/MomentModal";
import { TimelineFeed } from "@/components/TimelineFeed";
import { SelfieFlipbook } from "@/components/SelfieFlipbook";
import { EntryInspectorModal } from "@/components/EntryInspectorModal";
import { ExportModal } from "@/components/ExportModal";
import type { Entry } from "@/db/schema";

type ViewTab = "all" | "selfie" | "moment";

interface JournalDashboardProps {
  initialEntries: Entry[];
  dbError?: string | null;
}

export function JournalDashboard({
  initialEntries,
  dbError,
}: JournalDashboardProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [activeTab, setActiveTab] = useState<ViewTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);

  const [selfieOpen, setSelfieOpen] = useState(false);
  const [momentOpen, setMomentOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [inspectedEntry, setInspectedEntry] = useState<Entry | null>(null);

  const todayLocalDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const selfies = useMemo(
    () => entries.filter((e) => e.type === "selfie"),
    [entries]
  );

  const todaySelfieDone = useMemo(
    () => selfies.some((s) => s.localDate === todayLocalDate),
    [selfies, todayLocalDate]
  );

  const nextStreakEstimate = useMemo(() => {
    if (selfies.length === 0) return 1;
    const latest = selfies[0];
    if (latest.localDate === todayLocalDate) {
      return latest.streakDay ?? 1;
    }
    return (latest.streakDay ?? 0) + 1;
  }, [selfies, todayLocalDate]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (activeTab !== "all" && entry.type !== activeTab) {
        return false;
      }
      if (!q) return true;
      const inCaption = (entry.caption ?? "").toLowerCase().includes(q);
      const inMood = (entry.mood ?? "").toLowerCase().includes(q);
      const inTags = (entry.tags ?? []).some((t) =>
        t.toLowerCase().includes(q)
      );
      return inCaption || inMood || inTags;
    });
  }, [entries, activeTab, searchQuery]);

  function toggleTheme() {
    const html = document.documentElement;
    const currentlyDark = html.classList.contains("dark");
    if (currentlyDark) {
      html.classList.remove("dark");
      localStorage.setItem("rechordnlog-theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("rechordnlog-theme", "dark");
      setIsDark(true);
    }
  }

  async function handleLock() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/unlock");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-bg text-text-primary pb-28">
      {/* Sticky Minimal Header */}
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono text-base font-semibold tracking-tight">
              rechordnlog
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {todaySelfieDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-selfie/15 border border-selfie/30 px-2.5 py-1 font-mono text-[11px] font-medium text-selfie">
                Selfie: Done <Check className="w-3 h-3" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelfieOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-elevated border border-border-subtle px-2.5 py-1 font-mono text-[11px] text-text-muted hover:text-text-primary hover:border-accent/50 transition cursor-pointer"
              >
                Selfie: Pending
              </button>
            )}

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              title="Export & Integration"
              className="inline-flex items-center gap-1.5 rounded-xl bg-elevated border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-primary hover:border-text-muted/50 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-elevated border border-border-subtle text-text-muted hover:text-text-primary transition cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLock}
              title="Lock journal"
              aria-label="Lock journal"
              className="p-2 rounded-xl bg-elevated border border-border-subtle text-text-muted hover:text-accent transition cursor-pointer"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {dbError && (
          <div className="rounded-2xl bg-accent/10 border border-accent/30 px-4 py-3 font-mono text-xs text-accent">
            {dbError}
          </div>
        )}

        {/* Navigation & View Switcher + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-elevated border border-border-subtle">
            {(
              [
                { id: "all", label: "All Entries" },
                { id: "selfie", label: "Daily Selfies" },
                { id: "moment", label: "Moments" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                  activeTab === tab.id
                    ? "bg-surface text-text-primary shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-60">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search caption or #tag..."
              className="w-full rounded-xl bg-elevated border border-border-subtle pl-8 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selfie Flipbook when on Daily Selfies tab */}
        {activeTab === "selfie" && selfies.length > 0 && (
          <SelfieFlipbook
            selfies={selfies}
            onSelectEntry={(entry) => setInspectedEntry(entry)}
          />
        )}

        {/* Timeline Feed */}
        <TimelineFeed
          entries={filteredEntries}
          onSelectEntry={(entry) => setInspectedEntry(entry)}
          gridMode={activeTab === "selfie"}
        />
      </main>

      {/* Floating Bottom Action Dock (Thumb-Zone Optimized) */}
      <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-surface/85 backdrop-blur-md border border-border-subtle shadow-xl">
          <button
            type="button"
            onClick={() => setSelfieOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent text-white font-semibold text-sm px-4 py-3 hover:opacity-95 active:scale-[0.98] transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Daily Selfie
          </button>

          <button
            type="button"
            onClick={() => setMomentOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-elevated border border-border-subtle text-text-primary font-medium text-sm px-4 py-3 hover:bg-border-subtle/50 active:scale-[0.98] transition cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            Log Moment
          </button>
        </div>
      </div>

      {/* Modals */}
      {selfieOpen && (
        <SelfieModal
          isOpen={selfieOpen}
          onClose={() => setSelfieOpen(false)}
          nextStreakEstimate={nextStreakEstimate}
          onSaved={(newEntry) => setEntries((prev) => [newEntry, ...prev])}
        />
      )}

      {momentOpen && (
        <MomentModal
          isOpen={momentOpen}
          onClose={() => setMomentOpen(false)}
          onSaved={(newEntry) => setEntries((prev) => [newEntry, ...prev])}
        />
      )}

      {inspectedEntry && (
        <EntryInspectorModal
          key={inspectedEntry.id}
          entry={inspectedEntry}
          onClose={() => setInspectedEntry(null)}
          onUpdated={(updated) =>
            setEntries((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            )
          }
          onDeleted={(deletedId) =>
            setEntries((prev) => prev.filter((item) => item.id !== deletedId))
          }
        />
      )}

      {exportOpen && (
        <ExportModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          entries={entries}
        />
      )}
    </div>
  );
}
