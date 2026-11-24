"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Archive,
  Code2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildCanonicalExport,
  buildCsvExport,
  buildIntegrationGuide,
  INTEGRATION_SNIPPETS,
} from "@/lib/export-utils";
import type { Entry } from "@/db/schema";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportModal({ isOpen, onClose, entries }: ExportModalProps) {
  const [tab, setTab] = useState<"export" | "integration">("export");
  const [bundlingZip, setBundlingZip] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const payload = useMemo(() => buildCanonicalExport(entries), [entries]);
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (!isOpen) return null;

  function handleDownloadJson() {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerDownload(blob, `rechordnlog-export-${dateStamp}.json`);
  }

  function handleDownloadCsv() {
    const csv = buildCsvExport(payload);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `rechordnlog-export-${dateStamp}.csv`);
  }

  async function handleDownloadZip() {
    if (bundlingZip) return;
    setBundlingZip(true);
    try {
      const zip = new JSZip();
      zip.file("rechordnlog-data.json", JSON.stringify(payload, null, 2));
      zip.file("rechordnlog-data.csv", buildCsvExport(payload));
      zip.file("INTEGRATION_GUIDE.md", buildIntegrationGuide(payload));

      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `rechordnlog-bundle-${dateStamp}.zip`);
    } finally {
      setBundlingZip(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-xl bg-surface border border-border-subtle rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Export & Integration Hub
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-elevated border border-border-subtle">
            <button
              type="button"
              onClick={() => setTab("export")}
              className={cn(
                "py-2 rounded-lg text-xs font-medium transition cursor-pointer",
                tab === "export"
                  ? "bg-surface text-text-primary shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              Export Data
            </button>
            <button
              type="button"
              onClick={() => setTab("integration")}
              className={cn(
                "py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer",
                tab === "integration"
                  ? "bg-surface text-text-primary shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              Developer / Integration
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {tab === "export" ? (
            <>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-elevated border border-border-subtle p-3">
                  <div className="font-mono text-lg font-semibold">
                    {payload.summary.totalEntries}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-text-muted">
                    Total
                  </div>
                </div>
                <div className="rounded-xl bg-elevated border border-border-subtle p-3">
                  <div className="font-mono text-lg font-semibold text-selfie">
                    {payload.summary.totalSelfies}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-text-muted">
                    Selfies
                  </div>
                </div>
                <div className="rounded-xl bg-elevated border border-border-subtle p-3">
                  <div className="font-mono text-lg font-semibold text-accent">
                    {payload.summary.totalMoments}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-text-muted">
                    Moments
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="w-full flex items-center justify-between rounded-xl bg-elevated border border-border-subtle p-3.5 hover:border-accent/50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-accent shrink-0" />
                    <div>
                      <div className="text-sm font-medium">
                        Download Clean JSON
                      </div>
                      <div className="font-mono text-[11px] text-text-muted">
                        rechordnlog-export-{dateStamp}.json
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-text-muted" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="w-full flex items-center justify-between rounded-xl bg-elevated border border-border-subtle p-3.5 hover:border-accent/50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-selfie shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Download CSV</div>
                      <div className="font-mono text-[11px] text-text-muted">
                        Flat table for Notion / Sheets
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-text-muted" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={bundlingZip}
                  className="w-full flex items-center justify-between rounded-xl bg-accent text-white p-3.5 hover:opacity-95 disabled:opacity-60 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">
                        Download Portable ZIP Bundle
                      </div>
                      <div className="font-mono text-[11px] text-white/80">
                        JSON + CSV + INTEGRATION_GUIDE.md
                      </div>
                    </div>
                  </div>
                  {bundlingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    Canonical Schema Preview (v1.0.0)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("json", JSON.stringify(payload, null, 2))
                    }
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {copiedKey === "json" ? (
                      <>
                        <Check className="w-3 h-3 text-selfie" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-xl bg-elevated border border-border-subtle p-3 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(
                    {
                      ...payload,
                      entries: payload.entries.slice(0, 1),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    TypeScript Snippet
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("ts", INTEGRATION_SNIPPETS.typescript)
                    }
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {copiedKey === "ts" ? (
                      <>
                        <Check className="w-3 h-3 text-selfie" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-xl bg-elevated border border-border-subtle p-3 font-mono text-[11px] overflow-x-auto">
                  {INTEGRATION_SNIPPETS.typescript}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    Python Media Backup Snippet
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("py", INTEGRATION_SNIPPETS.python)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {copiedKey === "py" ? (
                      <>
                        <Check className="w-3 h-3 text-selfie" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-xl bg-elevated border border-border-subtle p-3 font-mono text-[11px] overflow-x-auto">
                  {INTEGRATION_SNIPPETS.python}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
