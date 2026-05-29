"use client";

import { useEffect, useState } from "react";
import { fetchProvidersOverview } from "@/lib/api/client";
import { Card, CardDescription, CardTitle, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ProviderStatus, RoutingStageSummary } from "@/lib/ai/providers/status";

export function ProviderPanel() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [routing, setRouting] = useState<RoutingStageSummary[]>([]);
  const [configuredCount, setConfiguredCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProvidersOverview()
      .then((data) => {
        setProviders(data.providers);
        setRouting(data.routing);
        setConfiguredCount(data.configuredCount);
      })
      .catch(() => setError("Failed to load provider status"));
  }, []);

  return (
    <Card>
      <div className="card-header-split">
        <div className="card-header-inner">
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>
            {error
              ? "Registry unavailable"
              : `${configuredCount} of ${providers.length} configured`}
          </CardDescription>
        </div>
        {!error && providers.length > 0 ? (
          <span className="badge badge-success shrink-0 normal-case">Mock fallback on all</span>
        ) : null}
      </div>

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : providers.length === 0 ? (
        <EmptyState title="Loading providers" description="Fetching configuration status…" />
      ) : (
        <div className="section-stack">
          <ul className="space-y-2">
            {providers.map((provider) => (
              <li key={provider.id}>
                <ProviderRow provider={provider} />
              </li>
            ))}
          </ul>
          <RoutingSummary routing={routing} />
        </div>
      )}
    </Card>
  );
}

function ProviderRow({ provider }: { provider: ProviderStatus }) {
  return (
    <div className="list-item-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">{provider.displayName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{provider.configuredModel}</p>
        </div>
        <StatusChip configured={provider.configured} />
      </div>
      {provider.routingRoles[0] && provider.routingRoles[0] !== "Available (not in active routing)" ? (
        <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{provider.routingRoles[0]}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={cn("badge normal-case", provider.apiKeyPresent ? "badge-success" : "badge-muted")}>
          {provider.apiKeyPresent ? "Key present" : "Missing key"}
        </span>
      </div>
    </div>
  );
}

function StatusChip({ configured }: { configured: boolean }) {
  return (
    <span className={cn("badge shrink-0 normal-case", configured ? "badge-success" : "badge-muted")}>
      {configured ? "Configured" : "Not configured"}
    </span>
  );
}

function RoutingSummary({ routing }: { routing: RoutingStageSummary[] }) {
  if (routing.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/70 pt-5">
      <h4 className="section-heading">Routing summary</h4>
      <ul className="space-y-2">
        {routing.map((entry) => (
          <li key={entry.stageId} className="routing-row">
            <span className="font-medium text-zinc-200">{entry.stageLabel}</span>
            <span className="text-zinc-500">
              <span className="text-zinc-300">{entry.primaryProviderLabel}</span>
              <span className="mx-1.5 text-zinc-600" aria-hidden>
                →
              </span>
              <span>{entry.fallbackProviderLabel}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
