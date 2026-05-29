"use client";

import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";

export function StatusBanner() {
  const { prompt, status, isGenerating, appSpec, error } = usePipeline();

  if (!prompt.trim() && !status) {
    return (
      <div
        className="status-banner border-dashed border-zinc-700/80 bg-zinc-900/20 text-zinc-400"
        role="status"
      >
        Enter a prompt and click <span className="font-medium text-zinc-300">Generate AppSpec</span>{" "}
        to start the pipeline.
      </div>
    );
  }

  if (isGenerating || status === "queued" || status === "running") {
    return (
      <div
        className={cn(
          "status-banner flex items-center gap-3 border-amber-500/30 bg-amber-500/[0.08] text-amber-100",
        )}
        role="status"
      >
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
        Generation in progress — stages update via SSE.
      </div>
    );
  }

  if (status === "completed" && appSpec) {
    return (
      <div
        className="status-banner border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100"
        role="status"
      >
        AppSpec generated successfully.
      </div>
    );
  }

  if (status === "failed" && !error) {
    return (
      <div className="status-banner border-red-500/30 bg-red-500/[0.08] text-red-200">
        Generation failed. Check validation errors below or retry with a clearer prompt.
      </div>
    );
  }

  return null;
}
