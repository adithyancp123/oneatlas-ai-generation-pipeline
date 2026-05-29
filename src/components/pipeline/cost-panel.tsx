"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";

export function CostPanel() {
  const { cost } = usePipeline();

  if (!cost || cost.lines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost</CardTitle>
          <CardDescription>Estimated token usage by pipeline stage</CardDescription>
        </CardHeader>
        <EmptyState
          title="No usage yet"
          description="Token cost breakdown appears after generation starts."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="card-header-split">
        <div className="card-header-inner">
          <CardTitle>Cost</CardTitle>
          <CardDescription>Estimated token cost by stage</CardDescription>
        </div>
        <div className="text-right">
          <p className="label-overline">Total</p>
          <p className="metric-highlight mt-2">${cost.totalUsd.toFixed(4)}</p>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Provider</th>
              <th className="text-right">Tokens</th>
              <th className="text-right">USD</th>
            </tr>
          </thead>
          <tbody>
            {cost.lines.map((line) => (
              <tr key={`${line.stageId}-${line.provider}`}>
                <td className="font-sans capitalize text-zinc-200">{line.stageId}</td>
                <td className="text-zinc-400">{line.provider}</td>
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
