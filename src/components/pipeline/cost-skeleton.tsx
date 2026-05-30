"use client";

import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

const ROWS = 4;

export function CostSkeleton() {
  return (
    <SkeletonRegion label="Loading cost breakdown" className="table-shell">
      <div className="border-b px-3.5 py-2.5" style={{ borderColor: "var(--border-strong)" }}>
        <div className="flex gap-4">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="ml-auto h-2.5 w-10" />
          <Skeleton className="h-2.5 w-8" />
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: "rgb(39 39 42 / 0.4)" }}>
        {Array.from({ length: ROWS }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-3.5 py-2.5">
            <Skeleton className="h-3 w-[4.5rem]" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="ml-auto h-3 w-10" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
