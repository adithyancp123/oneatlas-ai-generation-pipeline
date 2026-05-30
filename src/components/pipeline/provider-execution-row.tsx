"use client";

import { formatProviderExecutionLabel } from "@/lib/ai/provider-execution";
import { cn } from "@/lib/utils";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

const modeClass: Record<ProviderExecutionMeta["mode"], string> = {
  live: "text-emerald-300",
  mock: "text-zinc-500",
  fallback: "text-sky-300",
};

export interface ProviderExecutionRowProps {
  label: string;
  execution?: ProviderExecutionMeta;
  className?: string;
}

export function ProviderExecutionRow({ label, execution, className }: ProviderExecutionRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-xs", className)}>
      <span className="truncate font-medium text-zinc-300">{label}</span>
      {execution ? (
        <span
          className={cn("shrink-0 text-mono-data", modeClass[execution.mode])}
          title={
            execution.fallbackReason
              ? `${execution.model} — ${execution.fallbackReason}`
              : execution.model
          }
        >
          {formatProviderExecutionLabel(execution)}
          {execution.latencyMs !== undefined ? (
            <span className="ml-1.5 text-zinc-500">{execution.latencyMs}ms</span>
          ) : null}
        </span>
      ) : (
        <span className="shrink-0 text-mono-data text-zinc-600">—</span>
      )}
    </div>
  );
}
