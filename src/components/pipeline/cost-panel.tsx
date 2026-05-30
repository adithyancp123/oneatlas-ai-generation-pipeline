"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { CostSkeleton } from "@/components/pipeline/cost-skeleton";

function isCostLoading(isGenerating: boolean, hasLines: boolean): boolean {
  return isGenerating && !hasLines;
}

export function CostPanel() {
  const { cost, isGenerating } = usePipeline();
  const hasLines = Boolean(cost && cost.lines.length > 0);

  if (isCostLoading(isGenerating, hasLines)) {
    return (
      <Card compact aria-busy="true">
        <CardHeader>
          <CardTitle>Cost</CardTitle>
          <CardDescription>Per-stage token usage and estimated USD</CardDescription>
        </CardHeader>
        <CostSkeleton />
      </Card>
    );
  }

  if (!hasLines) {
    return (
      <Card compact>
        <CardHeader>
          <CardTitle>Cost</CardTitle>
          <CardDescription>Per-stage token usage and estimated USD</CardDescription>
        </CardHeader>
        <EmptyState
          compact
          title="Usage appears after the first stage"
          description="Each pipeline stage records prompt and completion tokens with an estimated dollar cost."
          successHint="Success: a sortable breakdown by stage and provider."
        />
      </Card>
    );
  }

  return (
    <Card compact>
      <div className="card-header-split">
        <div className="card-header-inner">
          <CardTitle>Cost</CardTitle>
          <CardDescription>Per-stage token usage and estimated USD</CardDescription>
        </div>
        <div className="text-right">
          <p className="label-overline">Total</p>
          <p className="metric-highlight metric-highlight-compact" aria-label="Total estimated cost">
            ${cost!.totalUsd.toFixed(4)}
          </p>
        </div>
      </div>
      <div className="table-shell table-shell-scroll">
        <table className="data-table" aria-label="Token cost by pipeline stage">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Provider</th>
              <th scope="col" className="text-right">
                Tokens
              </th>
              <th scope="col" className="text-right">
                USD
              </th>
            </tr>
          </thead>
          <tbody>
            {cost!.lines.map((line) => (
              <tr key={`${line.stageId}-${line.provider}`}>
                <td className="font-sans capitalize text-zinc-200">{line.stageId}</td>
                <td className="cell-mono text-zinc-400">{line.provider}</td>
                <td className="numeric">{line.promptTokens + line.completionTokens}</td>
                <td className="numeric">${line.estimatedUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
