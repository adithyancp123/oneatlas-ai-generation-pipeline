"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export function CostPanel() {
  const { cost } = usePipeline();

  if (!cost || cost.lines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost</CardTitle>
          <CardDescription>Token usage appears after generation starts</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost</CardTitle>
        <CardDescription>Estimated total: ${cost.totalUsd.toFixed(4)}</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-foreground/10 text-foreground/60">
              <th className="py-2 pr-2">Stage</th>
              <th className="py-2 pr-2">Provider</th>
              <th className="py-2 pr-2">Tokens</th>
              <th className="py-2">USD</th>
            </tr>
          </thead>
          <tbody>
            {cost.lines.map((line) => (
              <tr key={`${line.stageId}-${line.provider}`} className="border-b border-foreground/5">
                <td className="py-2 pr-2 capitalize">{line.stageId}</td>
                <td className="py-2 pr-2">{line.provider}</td>
                <td className="py-2 pr-2">
                  {line.promptTokens + line.completionTokens}
                </td>
                <td className="py-2">${line.estimatedUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
