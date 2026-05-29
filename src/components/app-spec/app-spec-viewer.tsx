"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

const methodBadgeClass: Record<string, string> = {
  GET: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  POST: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  PUT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function AppSpecViewer() {
  const { appSpec, status, isGenerating } = usePipeline();

  if (!appSpec) {
    const title =
      status === "failed"
        ? "No AppSpec produced"
        : isGenerating
          ? "Generating specification"
          : "No AppSpec yet";

    const description =
      status === "failed"
        ? "Review validation errors and refine your prompt, then try again."
        : isGenerating
          ? "Pipeline stages are running. Output will appear here when complete."
          : "Run Generate to produce a validated AppSpec with entities, endpoints, and workflows.";

    return (
      <Card className="flex min-h-[320px] flex-col lg:min-h-[480px]">
        <CardHeader>
          <CardTitle>AppSpec</CardTitle>
          <CardDescription>Validated output from the pipeline</CardDescription>
        </CardHeader>
        <EmptyState className="flex-1" title={title} description={description} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="card-header-split">
        <div className="card-header-inner">
          <CardTitle className="card-title-lg">{appSpec.name}</CardTitle>
          <CardDescription>{appSpec.description}</CardDescription>
        </div>
        <span className="badge badge-muted shrink-0 uppercase tracking-wide">
          {appSpec.intent.appType}
        </span>
      </div>

      <div className="section-stack">
        <section>
          <h4 className="section-heading">Entities</h4>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Name</th>
                  <th className="text-right">Fields</th>
                </tr>
              </thead>
              <tbody>
                {appSpec.dataSchema.entities.map((entity) => (
                  <tr key={entity.tableName}>
                    <td className="font-mono text-xs text-zinc-200">{entity.tableName}</td>
                    <td>{entity.name}</td>
                    <td className="numeric">{entity.fields.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h4 className="section-heading">API endpoints</h4>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th className="text-right">Auth</th>
                </tr>
              </thead>
              <tbody>
                {appSpec.apiEndpoints.map((endpoint) => (
                  <tr key={endpoint.id}>
                    <td>
                      <span
                        className={cn(
                          "badge badge-method",
                          methodBadgeClass[endpoint.method] ?? "badge-muted",
                        )}
                      >
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-zinc-200">{endpoint.path}</td>
                    <td className="numeric text-zinc-400">
                      {endpoint.authRequired ? "Required" : "Public"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {appSpec.workflows.length > 0 ? (
          <section>
            <h4 className="section-heading">Workflows</h4>
            <ul className="space-y-3">
              {appSpec.workflows.map((wf) => (
                <li key={wf.id} className="list-item-card">
                  <p className="text-sm font-medium text-zinc-100">{wf.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">Trigger: {wf.trigger}</p>
                  <ol className="mt-3 space-y-2 border-t border-zinc-800/70 pt-3">
                    {wf.steps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-xs text-zinc-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-800/50 text-[10px] font-medium tabular-nums text-zinc-400">
                          {index + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {appSpec.integrations.length > 0 ? (
          <section>
            <h4 className="section-heading">Spec integrations</h4>
            <ul className="space-y-2">
              {appSpec.integrations.map((hook) => (
                <li key={`${hook.integrationId}-${hook.trigger}`} className="list-item-card py-2.5">
                  <span className="font-medium text-zinc-100">{hook.integrationId}</span>
                  <span className="text-zinc-500">
                    {" "}
                    · {hook.trigger} → {hook.action}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
