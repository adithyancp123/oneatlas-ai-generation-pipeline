"use client";

import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export function AppSpecSkeleton() {
  return (
    <SkeletonRegion
      label="Generating AppSpec"
      className="panel-appspec-min-h flex flex-col gap-4 lg:flex-1"
    >
      <div className="space-y-2 border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
        <Skeleton className="h-4 w-[45%] max-w-xs" />
        <Skeleton className="h-3 w-[70%] max-w-md" />
      </div>
      <div className="panel-inset space-y-2.5 p-3">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-2.5 w-full max-w-sm" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-3 pt-0.5">
            <Skeleton className="h-2.5 w-[38%]" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-16" />
        <div className="table-shell overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b px-3.5 py-2.5 last:border-0"
                style={{ borderColor: "rgb(39 39 42 / 0.4)" }}
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="ml-auto h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
