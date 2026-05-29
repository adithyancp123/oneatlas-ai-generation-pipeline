"use client";

import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export function AppSpecViewer() {
  const { appSpec, status, isGenerating } = usePipeline();

  if (!appSpec) {
    const message =
      status === "failed"
        ? "No AppSpec was produced. Review errors and try again or refine your prompt."
        : isGenerating
          ? "Building your specification…"
          : "Run Generate to produce a validated AppSpec here.";

    return (
      <Card>
        <CardHeader>
          <CardTitle>AppSpec</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{appSpec.name}</CardTitle>
        <CardDescription>
          {appSpec.description}
          <span className="ml-2 rounded border border-foreground/15 px-1.5 py-0.5 text-xs uppercase">
            {appSpec.intent.appType}
          </span>
        </CardDescription>
      </CardHeader>

      <div className="space-y-6 text-sm">
        <section>
          <h4 className="mb-2 font-medium text-foreground/80">Entities</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-foreground/10 text-foreground/60">
                  <th className="py-2 pr-3">Table</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2">Fields</th>
                </tr>
              </thead>
              <tbody>
                {appSpec.dataSchema.entities.map((entity) => (
                  <tr key={entity.tableName} className="border-b border-foreground/5">
                    <td className="py-2 pr-3 font-mono">{entity.tableName}</td>
                    <td className="py-2 pr-3">{entity.name}</td>
                    <td className="py-2">{entity.fields.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h4 className="mb-2 font-medium text-foreground/80">API endpoints</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-foreground/10 text-foreground/60">
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2">Auth</th>
                </tr>
              </thead>
              <tbody>
                {appSpec.apiEndpoints.map((endpoint) => (
                  <tr key={endpoint.id} className="border-b border-foreground/5">
                    <td className="py-2 pr-3 font-mono">{endpoint.method}</td>
                    <td className="py-2 pr-3">{endpoint.path}</td>
                    <td className="py-2">{endpoint.authRequired ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {appSpec.workflows.length > 0 ? (
          <section>
            <h4 className="mb-2 font-medium text-foreground/80">Workflows</h4>
            <ul className="space-y-2">
              {appSpec.workflows.map((wf) => (
                <li
                  key={wf.id}
                  className="rounded-lg border border-foreground/10 px-3 py-2"
                >
                  <p className="font-medium">{wf.name}</p>
                  <p className="text-xs text-foreground/50">Trigger: {wf.trigger}</p>
                  <ol className="mt-1 list-inside list-decimal text-xs text-foreground/70">
                    {wf.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {appSpec.integrations.length > 0 ? (
          <section>
            <h4 className="mb-2 font-medium text-foreground/80">Integrations</h4>
            <ul className="list-inside list-disc space-y-1 text-foreground/70">
              {appSpec.integrations.map((hook) => (
                <li key={`${hook.integrationId}-${hook.trigger}`}>
                  {hook.integrationId}: {hook.trigger} → {hook.action}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
