"use client";

import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";

export function StatusBanner() {
  const { prompt, status, isGenerating, appSpec, error } = usePipeline();

  if (!prompt.trim() && !status) {
    return (
      <p className="rounded-lg border border-dashed border-foreground/20 px-4 py-3 text-sm text-foreground/60">
        Enter a prompt and click Generate to start the pipeline.
      </p>
    );
  }

  if (isGenerating || status === "queued" || status === "running") {
    return (
      <p
        className={cn(
          "rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100",
        )}
        role="status"
      >
        Generation in progress — stages update via SSE.
      </p>
    );
  }

  if (status === "completed" && appSpec) {
    return (
      <p
        className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-900 dark:text-green-100"
        role="status"
      >
        AppSpec generated successfully.
      </p>
    );
  }

  if (status === "failed" && !error) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-800 dark:text-red-200">
        Generation failed. Check validation errors below or retry with a clearer prompt.
      </p>
    );
  }

  return null;
}
