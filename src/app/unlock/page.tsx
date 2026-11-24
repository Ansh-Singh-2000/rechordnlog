"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Incorrect passcode.");
        setLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-text-primary flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-border-subtle p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono text-base font-semibold tracking-tight">
              rechordnlog
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 font-mono text-[11px] text-text-muted border border-border-subtle">
            <Lock className="w-3 h-3" />
            PRIVATE
          </span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight mb-1.5">
          Unlock Journal
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Enter your personal passcode to access your visual records.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="passcode" className="sr-only">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full rounded-xl bg-elevated border border-border-subtle px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
            />
          </div>

          {error && (
            <p className="font-mono text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !passcode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-white font-medium text-sm py-3 px-4 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Unlock
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
