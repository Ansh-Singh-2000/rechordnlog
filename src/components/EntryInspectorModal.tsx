"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  Save,
  Loader2,
  Code2,
  Calendar,
} from "lucide-react";
import type { Entry } from "@/db/schema";

interface EntryInspectorModalProps {
  entry: Entry | null;
  onClose: () => void;
  onUpdated: (entry: Entry) => void;
  onDeleted: (id: string) => void;
}

export function EntryInspectorModal({
  entry,
  onClose,
  onUpdated,
  onDeleted,
}: EntryInspectorModalProps) {
  const [caption, setCaption] = useState(entry?.caption ?? "");
  const [tagsText, setTagsText] = useState(
    (entry?.tags ?? []).map((t) => `#${t}`).join(" ")
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) return null;

  async function handleSave() {
    if (!entry || saving) return;
    setSaving(true);
    setError(null);

    try {
      const parsedTags = tagsText
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          tags: parsedTags,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update entry.");
      }

      const { entry: updated } = (await res.json()) as { entry: Entry };
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry || deleting) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete entry.");
      }

      onDeleted(entry.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  }

  const formattedStamp = `${entry.localDate.replace(/-/g, ".")} • ${entry.localTime.slice(0, 5)} • ${entry.timezone}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-surface border border-border-subtle rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={
                entry.type === "selfie"
                  ? "h-2 w-2 rounded-full bg-selfie shrink-0"
                  : "h-2 w-2 rounded-full bg-accent shrink-0"
              }
            />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider truncate">
              {entry.type === "selfie"
                ? `SELFIE • DAY #${entry.streakDay ?? 1}`
                : "MOMENT"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-[11px] bg-elevated border border-border-subtle text-text-muted hover:text-text-primary transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showJson ? "Hide JSON" : "JSON"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-black border border-border-subtle flex items-center justify-center max-h-[55vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt={entry.caption || "Journal entry"}
              className="w-full max-h-[55vh] object-contain"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedStamp}
            </span>
            {entry.mood && (
              <span className="rounded-full bg-selfie/15 text-selfie border border-selfie/30 px-2.5 py-0.5 text-[11px]">
                {entry.mood}
              </span>
            )}
          </div>

          {showJson && (
            <pre className="rounded-xl bg-elevated border border-border-subtle p-3.5 font-mono text-[11px] text-text-primary overflow-x-auto leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
                Caption
              </label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add or edit caption..."
                className="w-full rounded-xl bg-elevated border border-border-subtle px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
                Tags
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="#tag1 #tag2"
                className="w-full rounded-xl bg-elevated border border-border-subtle px-3.5 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          {error && (
            <p className="font-mono text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 hover:bg-accent/15 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Entry
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white bg-accent hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl px-3 py-2.5 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-text-primary text-bg px-4 py-2.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
