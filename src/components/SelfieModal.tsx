"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  FlipHorizontal2,
  RotateCcw,
  Check,
  X,
  Upload,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  compressImageForUpload,
  formatLocalDateParts,
  type CompressedImageResult,
} from "@/lib/image-utils";
import type { Entry } from "@/db/schema";

const MOODS = [
  "Calm",
  "Energized",
  "Focused",
  "Tired",
  "Grateful",
  "Chaos",
] as const;

interface SelfieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
  nextStreakEstimate: number;
}

export function SelfieModal({
  isOpen,
  onClose,
  onSaved,
  nextStreakEstimate,
}: SelfieModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [mirrorPreview, setMirrorPreview] = useState(true);

  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [compressed, setCompressed] = useState<CompressedImageResult | null>(
    null
  );
  const [compressing, setCompressing] = useState(false);

  const [mood, setMood] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera API unavailable in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(
        "Camera permission denied or unavailable. Use the native camera fallback below."
      );
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function init() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setCameraError("Camera API unavailable in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (active) setCameraReady(true);
      } catch {
        if (active) {
          setCameraError(
            "Camera permission denied or unavailable. Use the native camera fallback below."
          );
        }
      }
    }

    void init();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  async function processFile(rawFile: File) {
    setCompressing(true);
    setSaveError(null);
    try {
      const result = await compressImageForUpload(rawFile);
      const url = URL.createObjectURL(result.file);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(url);
      setCompressed(result);
      stopCamera();
    } catch {
      setSaveError("Could not process image. Please try again.");
    } finally {
      setCompressing(false);
    }
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Live preview is mirrored so it feels like a natural mirror;
    // un-mirror on capture unless user disabled mirroring.
    if (!mirrorPreview) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const rawFile = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        await processFile(rawFile);
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCompressed(null);
    setSaveError(null);
    void startCamera();
  }

  async function handleSave() {
    if (!compressed || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("folder", "selfies");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = (await uploadRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData.error || "Image upload failed.");
      }

      const { url, pathname } = (await uploadRes.json()) as {
        url: string;
        pathname: string;
      };

      const { localDate, localTime, timezone, isoTimestamp } =
        formatLocalDateParts(new Date());

      const entryRes = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "selfie",
          imageUrl: url,
          blobPathname: pathname,
          caption: caption.trim(),
          mood,
          tags: mood ? [mood.toLowerCase()] : [],
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
        throw new Error(errData.error || "Failed to save selfie entry.");
      }

      const { entry } = (await entryRes.json()) as { entry: Entry };
      onSaved(entry);
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save selfie."
      );
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
            <span className="h-2 w-2 rounded-full bg-selfie" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Daily Selfie • Day #{nextStreakEstimate}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!capturedUrl && (
              <button
                type="button"
                onClick={() => setMirrorPreview((v) => !v)}
                title="Toggle mirror preview"
                className={cn(
                  "p-2 rounded-lg border text-xs transition cursor-pointer",
                  mirrorPreview
                    ? "bg-elevated border-border-subtle text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary"
                )}
              >
                <FlipHorizontal2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close selfie modal"
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[4/5] w-full overflow-hidden flex items-center justify-center">
          {capturedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedUrl}
              alt="Captured selfie preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  mirrorPreview && "scale-x-[-1]"
                )}
              />
              {/* Subtle framing guide */}
              {cameraReady && (
                <div className="pointer-events-none absolute inset-6 rounded-2xl border border-white/20">
                  <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/50 rounded-tl" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/50 rounded-tr" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/50 rounded-bl" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/50 rounded-br" />
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-bg/95">
                  <Camera className="w-8 h-8 text-text-muted mb-3" />
                  <p className="text-sm text-text-muted mb-4">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent text-white text-sm font-medium px-4 py-2.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Open Native Camera / File
                  </button>
                </div>
              )}
            </>
          )}

          {compressing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="font-mono text-xs">Compressing WebP...</span>
            </div>
          )}

          {compressed && (
            <div className="absolute bottom-3 left-3 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 font-mono text-[11px] text-white/90 border border-white/10">
              {compressed.fileSizeKB} KB
              {savedPercent > 0 ? ` • ${savedPercent}% saved` : ""}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void processFile(file);
          }}
        />

        {/* Controls */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {!capturedUrl ? (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-elevated border border-border-subtle px-3 py-2.5 text-xs font-medium text-text-muted hover:text-text-primary transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Fallback
              </button>

              <button
                type="button"
                disabled={!cameraReady || compressing}
                onClick={handleShutter}
                aria-label="Capture selfie"
                className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-accent p-1 active:scale-95 disabled:opacity-40 transition cursor-pointer"
              >
                <span className="w-full h-full rounded-full bg-accent block" />
              </button>

              <div className="w-[82px] text-right font-mono text-[11px] text-text-muted">
                WebP 0.80
              </div>
            </div>
          ) : (
            <>
              {/* 1-tap mood pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-selfie" />
                    Mood (optional)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => {
                    const active = mood === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(active ? null : m)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer",
                          active
                            ? "bg-selfie/15 border-selfie text-selfie"
                            : "bg-elevated border-border-subtle text-text-muted hover:text-text-primary"
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-line quick note */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="1-line quick note (optional)..."
                maxLength={180}
                className="w-full rounded-xl bg-elevated border border-border-subtle px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />

              {saveError && (
                <p className="font-mono text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-elevated border border-border-subtle px-4 py-3 text-sm font-medium text-text-primary hover:bg-border-subtle/50 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-4 py-3 text-sm font-semibold hover:opacity-95 active:scale-[0.99] disabled:opacity-60 transition cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Selfie
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
