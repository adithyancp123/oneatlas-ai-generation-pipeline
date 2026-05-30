"use client";

import { AppSpecErrorPanel } from "@/components/app-spec/appspec-error-panel";
import { AuthRulesPanel } from "@/components/app-spec/auth-rules-panel";
import { AppSpecSkeleton } from "@/components/app-spec/appspec-skeleton";
import { WorkflowStubsPanel } from "@/components/app-spec/workflow-stubs-panel";
import { ProviderExecutionPanel } from "@/components/pipeline/provider-execution-panel";
import { usePipeline } from "@/hooks";
import { Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

const METHOD_BADGE_CLASS: Record<string, string> = {
  GET: "badge-method-get",
  POST: "badge-method-post",
  PUT: "badge-method-put",
  DELETE: "badge-method-delete",
  PATCH: "badge-method-patch",
};

export function AppSpecViewer() {
  const { appSpec, status, isGenerating } = usePipeline();

  if (!appSpec) {
    if (isGenerating) {
      return (
        <Card
          className="panel-appspec-min-h flex flex-col lg:min-h-0 lg:flex-1"
          aria-busy="true"
        >
          <CardHeader>
            <CardTitle>AppSpec</CardTitle>
            <CardDescription>Validated machine-readable specification</CardDescription>
          </CardHeader>
          <AppSpecSkeleton />
        </Card>
      );
    }

    const isFailed = status === "failed";

    return (
      <Card className="panel-appspec-min-h flex flex-col lg:min-h-0 lg:flex-1">
        <CardHeader>
          <CardTitle>AppSpec</CardTitle>
          <CardDescription>Validated machine-readable specification</CardDescription>
        </CardHeader>
        <EmptyState
          compact
          className="flex-1 justify-center"
          title={isFailed ? "Generation did not produce an AppSpec" : "Ready for your first AppSpec"}
          description={
            isFailed
              ? "Check validation errors below, refine the prompt, and run Generate again."
              : "Describe your product in the prompt panel, then run Generate to compile entities, API routes, and workflows."
          }
          {...(!isFailed
            ? {
                successHint:
                  "Success: a validated spec with entities, endpoints, workflows, and intent metadata.",
              }
            : {})}
        />
        <AppSpecErrorPanel />
      </Card>
    );
  }

  return (
    <Card className="lg:flex-1">
      <div className="card-header-split">
        <div className="card-header-inner">
          <CardTitle className="card-title-lg text-break" title={appSpec.name}>
            {appSpec.name}
          </CardTitle>
          <CardDescription className="text-break" title={appSpec.description}>
            {appSpec.description}
          </CardDescription>
        </div>
        <span className="badge badge-muted shrink-0 uppercase tracking-wide">
          {appSpec.intent.appType}
        </span>
      </div>

      <div className="section-stack">
        <div className="content-section pb-0 first:pt-0">
          <ProviderExecutionPanel />
        </div>

        {(appSpec.intent.detectedDomains?.length ?? 0) > 1 ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Domain prioritization</h4>
            <p className="section-subtitle">
              Conflicting domains were narrowed deterministically for MVP-first output.
            </p>
            <dl className="callout-meta">
              <div className="meta-field">
                <dt className="meta-label">Detected domains</dt>
                <dd className="badge-row">
                  {appSpec.intent.detectedDomains!.map((domain) => (
                    <span key={domain} className="badge badge-muted font-mono normal-case">
                      {domain}
                    </span>
                  ))}
                </dd>
              </div>
              {appSpec.intent.prioritizedDomain ? (
                <div className="meta-field">
                  <dt className="meta-label">Prioritized domain</dt>
                  <dd className="meta-value text-mono-data-strong text-zinc-200">
                    {appSpec.intent.prioritizedDomain}
                  </dd>
                </div>
              ) : null}
              {appSpec.intent.prioritizationReason ? (
                <div className="meta-field">
                  <dt className="meta-label">Reason</dt>
                  <dd className="meta-value text-zinc-400">{appSpec.intent.prioritizationReason}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {appSpec.intent.confidence !== undefined || appSpec.intent.ambiguityLevel ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Intent confidence</h4>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              {appSpec.intent.confidence !== undefined ? (
                <span className="badge badge-info tabular-nums normal-case">
                  Confidence {Math.round(appSpec.intent.confidence * 100)}%
                </span>
              ) : null}
              {appSpec.intent.ambiguityLevel ? (
                <span
                  className={cn(
                    "badge normal-case",
                    appSpec.intent.ambiguityLevel === "low" && "badge-success",
                    appSpec.intent.ambiguityLevel === "medium" && "badge-warning",
                    appSpec.intent.ambiguityLevel === "high" && "badge-warning",
                  )}
                >
                  {appSpec.intent.ambiguityLevel} ambiguity
                </span>
              ) : null}
            </div>
            {appSpec.intent.clarificationReason ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {appSpec.intent.clarificationReason}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs text-zinc-500">
              Assumption-driven generation — no blocking clarification step (
              <span className="font-mono">clarificationRequired: false</span>).
            </p>
          </section>
        ) : null}

        {appSpec.intent.warnings.length > 0 ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Warnings</h4>
            <ul className="callout-warning">
              {appSpec.intent.warnings.map((warning) => (
                <li key={warning} className="text-sm leading-relaxed text-break text-amber-100/95">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {appSpec.intent.assumptions.length > 0 ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Assumptions</h4>
            <ul className="callout-neutral">
              {appSpec.intent.assumptions.map((assumption) => (
                <li key={assumption} className="text-sm leading-snug text-zinc-300">
                  {assumption}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(appSpec.intent.requestedIntegrations?.length ?? 0) > 0 ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Integration resolution</h4>
            <p className="section-subtitle">
              Registry-driven matching — unsupported providers are preserved as structured
              metadata, not silently discarded.
            </p>
            <dl className="callout-meta">
              <div className="meta-field">
                <dt className="meta-label">Requested</dt>
                <dd className="badge-row">
                  {appSpec.intent.requestedIntegrations!.map((id) => (
                    <span key={id} className="badge badge-muted font-mono normal-case">
                      {id}
                    </span>
                  ))}
                </dd>
              </div>
              {(appSpec.intent.supportedIntegrations?.length ?? 0) > 0 ? (
                <div className="meta-field">
                  <dt className="meta-label meta-label-success">Supported</dt>
                  <dd className="badge-row">
                    {appSpec.intent.supportedIntegrations!.map((id) => (
                      <span key={id} className="badge badge-success font-mono normal-case">
                        {id}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              {(appSpec.intent.skippedIntegrations?.length ?? 0) > 0 ? (
                <div className="meta-field">
                  <dt className="meta-label meta-label-warning">Skipped</dt>
                  <dd className="space-y-1.5">
                    {appSpec.intent.skippedIntegrations!.map((item) => (
                      <p key={item.integration} className="text-xs leading-snug text-zinc-400">
                        <span className="text-mono-data-strong text-zinc-300">{item.integration}</span>
                        <span className="text-zinc-600"> — </span>
                        {item.reason}
                      </p>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="content-section content-section-bordered">
          <h4 className="section-heading">Entities</h4>
          <div className="table-shell table-shell-scroll">
            <table className="data-table" aria-label="Data schema entities">
              <thead>
                <tr>
                  <th scope="col">Table</th>
                  <th scope="col">Name</th>
                  <th scope="col" className="text-right">
                    Fields
                  </th>
                </tr>
              </thead>
              <tbody>
                {appSpec.dataSchema.entities.map((entity) => (
                  <tr key={entity.tableName}>
                    <td className="cell-mono" title={entity.tableName}>
                      {entity.tableName}
                    </td>
                    <td className="cell-wrap" title={entity.name}>
                      {entity.name}
                    </td>
                    <td className="numeric">{entity.fields.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="content-section content-section-bordered">
          <h4 className="section-heading">API endpoints</h4>
          <div className="table-shell table-shell-scroll">
            <table className="data-table" aria-label="API endpoints">
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Path</th>
                  <th scope="col" className="text-right">
                    Auth
                  </th>
                </tr>
              </thead>
              <tbody>
                {appSpec.apiEndpoints.map((endpoint) => (
                  <tr key={endpoint.id}>
                    <td>
                      <span
                        className={cn(
                          "badge badge-method",
                          METHOD_BADGE_CLASS[endpoint.method] ?? "badge-muted",
                        )}
                      >
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="cell-mono" title={endpoint.path}>
                      {endpoint.path}
                    </td>
                    <td className="numeric text-zinc-400">
                      {endpoint.authRequired ? "Required" : "Public"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <WorkflowStubsPanel workflows={appSpec.workflows} />

        <AuthRulesPanel auth={appSpec.auth} />

        <AppSpecErrorPanel />

        {appSpec.integrations.length > 0 ? (
          <section className="content-section content-section-bordered">
            <h4 className="section-heading">Spec integrations</h4>
            <ul className="space-y-1.5">
              {appSpec.integrations.map((hook) => (
                <li key={`${hook.integrationId}-${hook.trigger}`} className="list-item-card py-2">
                  <span className="font-medium text-break text-zinc-100">{hook.integrationId}</span>
                  <span className="text-break text-zinc-500">
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
