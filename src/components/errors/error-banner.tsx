"use client";

import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps {
  className?: string;
}

export function ErrorBanner({ className }: ErrorBannerProps) {
  const { error, validationErrors, repairLog } = usePipeline();

  if (!error && validationErrors.length === 0 && !repairLog) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {error ? (
        <div
          role="alert"
          className="status-banner border-red-500/30 bg-red-500/[0.08] text-red-200"
        >
          {error}
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="status-banner border-amber-500/30 bg-amber-500/[0.06] text-amber-100">
          <p className="font-medium text-amber-200">
            Validation issues ({validationErrors.length})
          </p>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
            {validationErrors.map((err) => (
              <li
                key={`${err.path}-${err.code}`}
                className="rounded-lg border border-amber-500/20 bg-zinc-950/40 px-3 py-2.5 text-xs"
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-[11px] font-medium text-amber-300">{err.code}</span>
                  <span className="text-zinc-500">@ {err.path || "root"}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-zinc-300">{err.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {repairLog && repairLog.entries.length > 0 ? (
        <div className="status-banner border-zinc-800/80 bg-zinc-900/30 text-zinc-300">
          <p className="font-medium text-zinc-200">Repair attempts ({repairLog.entries.length})</p>
          <ul className="mt-2.5 space-y-1.5 font-mono text-xs text-zinc-400">
            {repairLog.entries.map((entry) => (
              <li key={`${entry.attempt}-${entry.strategy}`}>
                #{entry.attempt} {entry.strategy} → {entry.outcome}{" "}
                <span className="text-zinc-500">({entry.latencyMs}ms)</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
