"use client";

import { usePipeline } from "@/hooks";
import type { RepairLogEntry, ValidationError } from "@/types/job";
import { cn } from "@/lib/utils";

function parseRepairErrorInput(raw: string): { code?: string; message?: string; field?: string }[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as { code?: string; message?: string; field?: string }[];
    }
    return [];
  } catch {
    return [];
  }
}

function ValidationErrorList({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null;

  return (
    <div>
      <p className="meta-label mb-2">Validation errors</p>
      <ul className="space-y-2">
        {errors.map((err) => (
          <li
            key={`${err.field}-${err.code}-${err.message}`}
            className="rounded-lg border border-amber-500/20 bg-zinc-950/40 px-3 py-2"
          >
            <dl className="grid gap-1 text-xs sm:grid-cols-[minmax(0,7rem)_1fr]">
              <dt className="text-zinc-500">Field</dt>
              <dd className="text-mono-data text-break text-zinc-300">{err.field || "root"}</dd>
              <dt className="text-zinc-500">Code</dt>
              <dd className="text-mono-data-strong text-amber-300">{err.code}</dd>
              <dt className="text-zinc-500">Message</dt>
              <dd className="text-break leading-relaxed text-zinc-200">{err.message}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepairAttemptCard({ entry }: { entry: RepairLogEntry }) {
  const inputErrors = parseRepairErrorInput(entry.errorInput ?? entry.inputError);

  return (
    <li className="rounded-lg border border-zinc-800/60 bg-zinc-950/35 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-muted normal-case">{entry.strategy}</span>
        <span
          className={cn(
            "badge normal-case",
            entry.outcome === "repaired" && "badge-success",
            entry.outcome === "escalated" && "badge-warning",
            entry.outcome === "failed" && "border border-red-500/30 bg-red-500/10 text-red-300",
          )}
        >
          {entry.outcome}
        </span>
        <span className="text-xs text-zinc-500">
          round {entry.attempt} · {entry.errorsFixed} fixed · {entry.latencyMs}ms
        </span>
      </div>

      {inputErrors.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5 border-t border-zinc-800/60 pt-2">
          {inputErrors.map((item, index) => (
            <li key={`${entry.timestamp}-${index}`} className="text-xs text-zinc-400">
              <span className="text-mono-data-strong text-zinc-300">{item.code ?? "error"}</span>
              {item.field ? (
                <span className="text-zinc-600">
                  {" "}
                  @ <span className="text-zinc-500">{item.field}</span>
                </span>
              ) : null}
              {item.message ? (
                <p className="mt-0.5 text-break text-zinc-300">{item.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Validation + repair panel — data from job.validationErrors and job.repairLog (via pipeline store).
 */
export function AppSpecErrorPanel() {
  const { validationErrors, repairLog } = usePipeline();

  const hasRepair = (repairLog?.entries.length ?? 0) > 0;
  const hasValidation = validationErrors.length > 0;

  if (!hasValidation && !hasRepair) {
    return null;
  }

  const fullyRepaired = Boolean(repairLog?.success && !hasValidation);

  return (
    <section
      className={cn(
        "content-section content-section-bordered",
        fullyRepaired && "border-emerald-500/25",
      )}
      aria-label="Validation and repair"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="section-heading">Validation &amp; repair</h4>
        {fullyRepaired ? (
          <span className="badge badge-success normal-case">Repaired</span>
        ) : hasValidation ? (
          <span className="badge badge-warning normal-case">Issues remain</span>
        ) : hasRepair ? (
          <span className="badge badge-info normal-case">Repair log</span>
        ) : null}
      </div>

      {fullyRepaired ? (
        <p className="mb-3 text-sm text-emerald-300/95">
          Repair completed successfully — prior validation issues were resolved.
        </p>
      ) : null}

      <div className="space-y-4">
        <ValidationErrorList errors={validationErrors} />

        {hasRepair ? (
          <div>
            <p className="meta-label mb-2">Repair attempts</p>
            <ul className="space-y-2">
              {repairLog!.entries.map((entry) => (
                <RepairAttemptCard key={`${entry.attempt}-${entry.strategy}-${entry.timestamp}`} entry={entry} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
