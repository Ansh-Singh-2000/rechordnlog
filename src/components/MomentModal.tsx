"use client";

import { useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  X,
  Check,
  Loader2,
  Clock,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  compressImageForUpload,
  formatLocalDateParts,
  type CompressedImageResult,
} from "@/lib/image-utils";
import type { Entry } from "@/db/schema";

interface MomentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}

export function MomentModal({ isOpen, onClose, onSaved }: MomentModalProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressed, setCompressed] = useState<CompressedImageResult | null>(
    null
  );
  const [compressing, setCompressing] = useState(false);

  const [useOriginalDate, setUseOriginalDate] = useState(false);
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  }

  async function handleFileSelect(rawFile: File) {
    setCompressing(true);
    setError(null);
    try {
      const result = await compressImageForUpload(rawFile);
      const url = URL.createObjectURL(result.file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setCompressed(result);
    } catch {
      setError("Failed to compress image. Please try another photo.");
    } finally {
      setCompressing(false);
    }
  }

  function parseTags(raw: string): string[] {
    return raw
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  async function handleSave() {
    if (!compressed || saving) return;
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("folder", "moments");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = (await uploadRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData.error || "Upload failed.");
      }

      const { url, pathname } = (await uploadRes.json()) as {
        url: string;
        pathname: string;
      };

      const targetDate =
        useOriginalDate && compressed.originalFileTimestamp
          ? new Date(compressed.originalFileTimestamp)
          : new Date();

      const { localDate, localTime, timezone, isoTimestamp } =
        formatLocalDateParts(targetDate);

      const entryRes = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "moment",
          imageUrl: url,
          blobPathname: pathname,
          caption: caption.trim(),
          tags: parseTags(tagInput),
          localDate,
          localTime,
          timezone,
          recordedAt: isoTimestamp,
          metadata: {
            width: compressed.width,
            height: compressed.height,
            fileSizeKB: compressed.fileSizeKB,
            originalSizeKB: compressed.originalSizeKB,
            mimeType: compressed.mimeType,
            originalFileTimestamp: compressed.originalFileTimestamp,
            device: compressed.device,
          },
        }),
      });

      if (!entryRes.ok) {
        const errData = (await entryRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData.error || "Failed to save moment.");
      }

      const { entry } = (await entryRes.json()) as { entry: Entry };
      onSaved(entry);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save moment.");
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const savedPercent =
    compressed && compressed.originalSizeKB > compressed.fileSizeKB
      ? Math.round(
          ((compressed.originalSizeKB - compressed.fileSizeKB) /
            compressed.originalSizeKB) *
            100
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Log Moment
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close moment modal"
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Image Picker / Preview */}
          {!previewUrl ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-elevated border border-border-subtle p-6 hover:border-accent/60 transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Take Photo</span>
                <span className="font-mono text-[11px] text-text-muted">
                  Rear Camera
                </span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-elevated border border-border-subtle p-6 hover:border-accent/60 transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-surface text-text-primary border border-border-subtle flex items-center justify-center">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Gallery</span>
                <span className="font-mono text-[11px] text-text-muted">
                  Upload Image
                </span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-border-subtle max-h-72 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Moment preview"
                className="w-full max-h-72 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setCompressed(null);
                }}
                className="absolute top-2.5 right-2.5 rounded-full bg-black/70 text-white p-1.5 hover:bg-black transition cursor-pointer"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
              {compressed && (
                <div className="absolute bottom-2.5 left-2.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 font-mono text-[11px] text-white/90 border border-white/10">
                  {compressed.originalSizeKB} KB → {compressed.fileSizeKB} KB
                  {savedPercent > 0 ? ` (${savedPercent}% saved)` : ""}
                </div>
              )}
            </div>
          )}

          {compressing && (
            <div className="flex items-center justify-center gap-2 py-4 font-mono text-xs text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Compressing image to WebP...
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelect(file);
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelect(file);
            }}
          />

          {/* Original Timestamp Toggle */}
          {compressed?.originalFileTimestamp && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-elevated border border-border-subtle px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-text-muted shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium">
                    {useOriginalDate
                      ? "Use Photo's Original Date"
                      : "Use Current Time"}
                  </div>
                  <div className="font-mono text-[10px] text-text-muted truncate">
                    {useOriginalDate
                      ? new Date(compressed.originalFileTimestamp).toLocaleString()
                      : "Now"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseOriginalDate((v) => !v)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-mono text-[11px] border transition shrink-0 cursor-pointer",
                  useOriginalDate
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-surface border-border-subtle text-text-muted"
                )}
              >
                {useOriginalDate ? "Original" : "Now"}
              </button>
            </div>
          )}

          {/* Caption */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Write the story or context of this moment..."
              className="w-full rounded-xl bg-elevated border border-border-subtle px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
            />
          </div>

          {/* Tags */}
          <div className="relative">
            <Tag className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="#travel #food #milestone"
              className="w-full rounded-xl bg-elevated border border-border-subtle pl-10 pr-3.5 py-2.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <p className="font-mono text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!compressed || saving || compressing}
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-4 py-3 text-sm font-semibold hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading & Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Moment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
