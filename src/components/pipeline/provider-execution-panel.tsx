"use client";

import { PIPELINE_STAGE_ORDER } from "@/config/constants";
import { ProviderExecutionRow } from "@/components/pipeline/provider-execution-row";
import { usePipeline } from "@/hooks";
import type { PipelineStageId } from "@/types/pipeline";

const STAGE_LABELS: Record<PipelineStageId, string> = {
  intentExtraction: "Intent extraction",
  schemaGeneration: "Schema generation",
  appSpecGeneration: "AppSpec generation",
  repair: "Repair",
};

export function ProviderExecutionPanel() {
  const { providerExecutions } = usePipeline();

  if (providerExecutions.length === 0) return null;

  return (
    <section className="panel-inset">
      <h4 className="panel-inset-heading">Provider execution</h4>
      <p className="section-subtitle mb-0 mt-1">Live API vs mock fallback per stage.</p>
      <ul className="inset-panel-body">
        {PIPELINE_STAGE_ORDER.map((stageId) => {
          const execution = providerExecutions.find((entry) => entry.stageId === stageId);
          if (!execution) return null;
          return (
            <li key={stageId} className="list-row">
              <ProviderExecutionRow label={STAGE_LABELS[stageId]} execution={execution} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
