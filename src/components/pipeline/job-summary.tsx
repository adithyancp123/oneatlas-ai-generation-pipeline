"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { JobSummarySkeleton } from "@/components/pipeline/job-summary-skeleton";

const STATUS_DISPLAY: Record<string, string> = {
  queued: "Queued",
  running: "In progress",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function JobSummary() {
  const { jobId, status, latencies, repairLog, validationErrors, isGenerating } = usePipeline();

  const totalMs = latencies.reduce((sum, l) => sum + l.durationMs, 0);
  const repairCount = repairLog?.entries.length ?? 0;

  if (!jobId && isGenerating) {
    return <JobSummarySkeleton />;
  }

  if (!jobId) {
    return null;
  }

  if (isGenerating && latencies.length === 0) {
    return <JobSummarySkeleton />;
  }

  const statusLabel = status ? (STATUS_DISPLAY[status] ?? status) : "—";

  return (
    <Card compact>
      <CardHeader>
        <CardTitle>Job summary</CardTitle>
        <CardDescription
          className="text-mono-data text-break-all normal-case tracking-tight"
          title={jobId}
        >
          {jobId}
        </CardDescription>
      </CardHeader>
      <dl className="stat-grid" aria-label="Job metrics">
        <SummaryItem label="Status" value={statusLabel} />
        <SummaryItem
          label="Duration"
          value={totalMs > 0 ? `${totalMs}ms` : "—"}
          mono
        />
        <SummaryItem label="Repairs" value={String(repairCount)} mono />
        <SummaryItem
          label="Validation"
          value={String(validationErrors.length)}
          highlight={validationErrors.length > 0}
          mono
        />
      </dl>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="stat-card">
      <dt className="stat-label">{label}</dt>
      <dd
        className={cn(
          "stat-value min-w-0",
          mono && "text-mono-data-strong font-semibold text-zinc-100",
          highlight && "text-amber-300",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
