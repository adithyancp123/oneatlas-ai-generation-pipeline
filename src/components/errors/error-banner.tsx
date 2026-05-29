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
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Validation issues ({validationErrors.length})
          </p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs leading-relaxed text-amber-950/90 dark:text-amber-50/90">
            {validationErrors.map((err) => (
              <li key={`${err.path}-${err.code}`} className="border-b border-amber-500/10 pb-2 last:border-0">
                <span className="font-mono text-[11px]">{err.code}</span>
                <span className="text-foreground/60"> @ {err.path || "root"}</span>
                <p className="mt-0.5">{err.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {repairLog && repairLog.entries.length > 0 ? (
        <div className="rounded-lg border border-foreground/15 px-4 py-3 text-sm">
          <p className="font-medium">Repair attempts ({repairLog.entries.length})</p>
          <ul className="mt-2 space-y-1 text-foreground/70">
            {repairLog.entries.map((entry) => (
              <li key={`${entry.attempt}-${entry.strategy}`}>
                #{entry.attempt} {entry.strategy} → {entry.outcome} ({entry.latencyMs}ms)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
