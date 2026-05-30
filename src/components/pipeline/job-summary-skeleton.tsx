"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export function JobSummarySkeleton() {
  return (
    <Card compact>
      <CardHeader>
        <CardTitle>Job summary</CardTitle>
        <SkeletonRegion label="Loading job identifier" className="mt-1 block w-full">
          <Skeleton className="h-3 w-full max-w-[14rem]" />
        </SkeletonRegion>
      </CardHeader>
      <SkeletonRegion label="Loading job metrics" className="stat-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="stat-card pointer-events-none">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="mt-2 h-4 w-10" />
          </div>
        ))}
      </SkeletonRegion>
    </Card>
  );
}
