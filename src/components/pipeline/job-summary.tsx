"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export function JobSummary() {
  const { jobId, status, latencies, repairLog, validationErrors } = usePipeline();

  const totalMs = latencies.reduce((sum, l) => sum + l.durationMs, 0);
  const repairCount = repairLog?.entries.length ?? 0;

  if (!jobId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Job summary</CardTitle>
        <CardDescription className="font-mono text-xs">{jobId}</CardDescription>
      </CardHeader>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-foreground/60">Status</dt>
          <dd className="capitalize">{status ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-foreground/60">Duration</dt>
          <dd>{totalMs > 0 ? `${totalMs}ms` : "—"}</dd>
        </div>
        <div>
          <dt className="text-foreground/60">Repair attempts</dt>
          <dd>{repairCount}</dd>
        </div>
        <div>
          <dt className="text-foreground/60">Validation issues</dt>
          <dd>{validationErrors.length}</dd>
        </div>
      </dl>
    </Card>
  );
}
