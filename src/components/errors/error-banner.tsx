"use client";

import { usePipeline } from "@/hooks";
import { extractRepairNotices } from "@/lib/pipeline/repair/repair-log";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps {
  className?: string;
}

function formatRepairInputError(inputError: string): string {
  try {
    const parsed = JSON.parse(inputError) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return inputError;
  }
}

export function ErrorBanner({ className }: ErrorBannerProps) {
  const { error, validationErrors, repairLog } = usePipeline();

  if (!error && validationErrors.length === 0 && !repairLog) return null;

  const repairRounds = repairLog
    ? new Set(repairLog.entries.map((e) => e.attempt)).size
    : 0;
  const repairNotices = extractRepairNotices(repairLog);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} aria-live="polite">
      {error ? (
        <div
          role="alert"
          className="status-banner text-break border-red-500/30 bg-red-500/[0.08] text-red-200"
        >
          {error}
        </div>
      ) : null}

      {repairNotices.length > 0 ? (
        <div
          className="status-banner border-sky-500/25 bg-sky-500/[0.06] text-sky-100"
          role="status"
          aria-label="Repair adjustments"
        >
          <p className="font-medium text-sky-200">Repair adjustments</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-sky-100/90">
            {repairNotices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div
          className="status-banner border-amber-500/30 bg-amber-500/[0.06] text-amber-100"
          role="region"
          aria-label={`Validation issues, ${validationErrors.length} total`}
        >
          <p className="font-medium text-amber-200">
            Validation issues ({validationErrors.length})
          </p>
          <ul className="scroll-y-region mt-2.5 max-h-48 space-y-1.5 pr-0.5">
            {validationErrors.map((err) => (
              <li
                key={`${err.path}-${err.code}`}
                className="rounded-lg border border-amber-500/18 bg-zinc-950/35 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-mono-data-strong text-amber-300">{err.code}</span>
                  <span className="text-break-all text-zinc-500" title={err.path || "root"}>
                    @ {err.path || "root"}
                  </span>
                </div>
                <p className="mt-1.5 text-break leading-relaxed text-zinc-300">{err.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {repairLog && repairLog.entries.length > 0 ? (
        <div
          className="status-banner border-zinc-800/80 bg-zinc-900/30 text-zinc-300"
          role="region"
          aria-label="Repair log"
        >
          <p className="font-medium text-zinc-200">
            Repair log — {repairLog.entries.length} attempt{repairLog.entries.length === 1 ? "" : "s"},{" "}
            {repairRounds} round{repairRounds === 1 ? "" : "s"}
          </p>
          <ul className="scroll-y-region mt-2.5 max-h-64 space-y-1.5 pr-0.5">
            {repairLog.entries.map((entry) => (
              <li
                key={`${entry.attempt}-${entry.strategy}-${entry.timestamp}`}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/28 px-3 py-2"
              >
                <p className="text-mono-data text-break text-zinc-300">
                  Round {entry.attempt} · {entry.stageId} · {entry.strategy} →{" "}
                  <span
                    className={cn(
                      entry.outcome === "repaired" && "text-emerald-400",
                      entry.outcome === "escalated" && "text-amber-400",
                      entry.outcome === "failed" && "text-red-400",
                    )}
                  >
                    {entry.outcome}
                  </span>{" "}
                  <span className="text-zinc-500">({entry.latencyMs}ms)</span>
                </p>
                <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed text-zinc-500">
                  {formatRepairInputError(entry.inputError)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
