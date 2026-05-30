"use client";

import type { WorkflowStub, WorkflowStepMeta } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface WorkflowStubsPanelProps {
  workflows: WorkflowStub[];
}

function parseStepRef(step: string): { integrationId: string; actionId: string } | null {
  const colon = step.indexOf(":");
  if (colon === -1) return null;
  return {
    integrationId: step.slice(0, colon),
    actionId: step.slice(colon + 1),
  };
}

function primaryStepMeta(workflow: WorkflowStub): WorkflowStepMeta | undefined {
  return workflow.stepMeta?.[0];
}

function resolveIntegrationAction(workflow: WorkflowStub): {
  integrationId: string;
  actionId: string;
} {
  const meta = primaryStepMeta(workflow);
  if (meta?.integrationId && meta.actionId) {
    return { integrationId: meta.integrationId, actionId: meta.actionId };
  }
  const parsed = workflow.steps[0] ? parseStepRef(workflow.steps[0]) : null;
  return {
    integrationId: parsed?.integrationId ?? "—",
    actionId: parsed?.actionId ?? "—",
  };
}

function collectPayloadMappings(workflow: WorkflowStub): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const meta of workflow.stepMeta ?? []) {
    if (!meta.payloadMapping) continue;
    for (const [key, value] of Object.entries(meta.payloadMapping)) {
      rows.push({ key, value });
    }
  }
  return rows;
}

export function WorkflowStubsPanel({ workflows }: WorkflowStubsPanelProps) {
  return (
    <section className="content-section content-section-bordered" aria-label="Workflow stubs">
      <h4 className="section-heading">Workflow stubs</h4>
      <p className="section-subtitle">Trigger bindings, integration actions, and payload field maps.</p>

      {workflows.length === 0 ? (
        <p className="text-sm text-zinc-500">No workflow stubs generated</p>
      ) : (
        <ul className="space-y-3">
          {workflows.map((workflow) => {
            const { integrationId, actionId } = resolveIntegrationAction(workflow);
            const payloadRows = collectPayloadMappings(workflow);
            const triggerEntity = workflow.triggerMeta?.entity ?? "—";
            const triggerEvent = workflow.triggerMeta?.event ?? workflow.trigger;

            return (
              <li key={workflow.id} className="list-item-card">
                <p className="text-sm font-medium text-break text-zinc-100" title={workflow.name}>
                  {workflow.name}
                </p>

                <dl className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <div className="meta-field">
                    <dt className="meta-label">Trigger entity</dt>
                    <dd className="meta-value text-mono-data-strong text-zinc-200">{triggerEntity}</dd>
                  </div>
                  <div className="meta-field">
                    <dt className="meta-label">Trigger event</dt>
                    <dd className="meta-value text-mono-data text-zinc-300">{triggerEvent}</dd>
                  </div>
                  <div className="meta-field">
                    <dt className="meta-label">Integration ID</dt>
                    <dd>
                      <span className="badge badge-muted font-mono normal-case">{integrationId}</span>
                    </dd>
                  </div>
                  <div className="meta-field">
                    <dt className="meta-label">Action</dt>
                    <dd>
                      <span className="badge badge-info font-mono normal-case">{actionId}</span>
                    </dd>
                  </div>
                </dl>

                {payloadRows.length > 0 ? (
                  <div className="mt-3 border-t border-zinc-800/70 pt-3">
                    <p className="meta-label mb-2">Payload mappings</p>
                    <ul className="space-y-1">
                      {payloadRows.map((row) => (
                        <li
                          key={`${workflow.id}-${row.key}`}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
                        >
                          <span className="text-mono-data-strong text-zinc-300">{row.key}</span>
                          <span className="text-zinc-600" aria-hidden>
                            →
                          </span>
                          <span className="text-break text-zinc-400">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-zinc-800/70 pt-3 text-xs text-zinc-500">
                    No payload field mappings
                  </p>
                )}

                {workflow.steps.length > 1 ? (
                  <ol className="mt-3 space-y-1 border-t border-zinc-800/70 pt-3">
                    <p className="meta-label mb-1.5">Steps</p>
                    {workflow.steps.map((step, index) => (
                      <li key={step} className="flex gap-2 text-xs text-zinc-400">
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded",
                            "border border-zinc-700/80 bg-zinc-800/50 text-[9px] tabular-nums",
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-break font-mono">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
