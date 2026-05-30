"use client";

import { PIPELINE_STAGE_ORDER } from "@/config/constants";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

const STAGE_LABELS: Record<(typeof PIPELINE_STAGE_ORDER)[number], string> = {
  intentExtraction: "Intent extraction",
  schemaGeneration: "Schema generation",
  appSpecGeneration: "AppSpec generation",
  repair: "Repair",
};

export function PipelineSkeleton() {
  return (
    <SkeletonRegion label="Loading pipeline stages" className="pipeline-list">
      {PIPELINE_STAGE_ORDER.map((stageId, index) => {
        const isLast = index === PIPELINE_STAGE_ORDER.length - 1;
        return (
          <div key={stageId} className="relative">
            {!isLast ? <span className="pipeline-connector" aria-hidden /> : null}
            <div className="pipeline-stage pipeline-stage-pending pointer-events-none opacity-90">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="h-[1.375rem] w-[1.375rem] shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="sr-only">{STAGE_LABELS[stageId]}</span>
                  <Skeleton className="h-3.5 w-[55%] max-w-[9rem]" />
                  <Skeleton className="h-2.5 w-[40%] max-w-[7rem]" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
          </div>
        );
      })}
    </SkeletonRegion>
  );
}
