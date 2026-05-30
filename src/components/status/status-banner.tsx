"use client";

import { usePipeline } from "@/hooks";
import { hasMockExecution } from "@/lib/ai/provider-execution";
import { cn } from "@/lib/utils";

export function StatusBanner() {
  const { prompt, status, isGenerating, appSpec, error, providerExecutions } = usePipeline();
  const mockStages = providerExecutions.filter(
    (entry) => entry.mode === "mock" || entry.mode === "fallback",
  );

  if (!prompt.trim() && !status) {
    return (
      <div
        className="status-banner border-dashed border-zinc-700/80 bg-zinc-900/20 text-zinc-400"
        role="status"
      >
        Describe your product, then select{" "}
        <span className="font-medium text-zinc-300">Generate AppSpec</span> to run the pipeline.
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
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" aria-hidden />
        <span>
          Pipeline running — stage progress streams live and syncs every few seconds.
        </span>
      </div>
    );
  }

  if (status === "completed" && appSpec) {
    if (hasMockExecution(providerExecutions)) {
      const stageNames = mockStages.map((entry) => entry.stageId).join(", ");
      return (
        <div
          className="status-banner border-sky-500/25 bg-sky-500/[0.06] text-sky-100"
          role="status"
        >
          Running in mock fallback mode for{" "}
          {mockStages.length === 1 ? "this stage" : "some stages"}
          {stageNames ? ` (${stageNames})` : ""}. Provider execution details are in the
          pipeline and AppSpec panels.
        </div>
      );
    }

    if (appSpec.intent.ambiguityLevel === "high") {
      return (
        <div
          className="status-banner border-amber-500/30 bg-amber-500/[0.08] text-amber-100"
          role="status"
        >
          High prompt ambiguity — assumptions were applied instead of blocking clarification.
          Review Intent confidence in the AppSpec panel.
        </div>
      );
    }

    if (appSpec.intent.warnings.length > 0) {
      return (
        <div
          className="status-banner border-amber-500/30 bg-amber-500/[0.08] text-amber-100"
          role="status"
        >
          AppSpec generated with {appSpec.intent.warnings.length} notice
          {appSpec.intent.warnings.length === 1 ? "" : "s"} — review Warnings and Assumptions in
          the output panel.
        </div>
      );
    }

    return (
      <div
        className="status-banner border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100"
        role="status"
      >
        AppSpec ready — review entities, endpoints, and workflows in the output panel.
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
