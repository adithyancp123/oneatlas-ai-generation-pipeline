"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

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
        <CardTitle>Job summary</CardTitle>
        <CardDescription className="font-mono text-[11px] leading-relaxed break-all">
          {jobId}
        </CardDescription>
      </CardHeader>
      <dl className="stat-grid">
        <SummaryItem label="Status" value={status ?? "—"} capitalize />
        <SummaryItem label="Duration" value={totalMs > 0 ? `${totalMs}ms` : "—"} />
        <SummaryItem label="Repairs" value={String(repairCount)} />
        <SummaryItem
          label="Validation"
          value={String(validationErrors.length)}
          highlight={validationErrors.length > 0}
        />
      </dl>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  capitalize = false,
  highlight = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="stat-card">
      <dt className="stat-label">{label}</dt>
      <dd className={cn("stat-value", capitalize && "capitalize", highlight && "text-amber-300")}>
        {value}
      </dd>
    </div>
  );
}
