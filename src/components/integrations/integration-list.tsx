"use client";

import { useEffect, useState } from "react";
import { fetchIntegrations } from "@/lib/api/client";
import { EmptyState } from "@/components/ui";

export function IntegrationList() {
  const [integrations, setIntegrations] = useState<
    Awaited<ReturnType<typeof fetchIntegrations>>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchIntegrations()
      .then(setIntegrations)
      .catch(() => setError("Failed to load integrations"));
  }, []);

  if (error) {
    return (
      <p className="alert-error" role="alert">
        {error}
      </p>
    );
  }

  if (integrations.length === 0) {
    return (
      <EmptyState
        compact
        title="Loading integration registry"
        description="Fetching supported connectors, triggers, and actions."
        successHint="Success: connector cards with auth type and capability counts."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {integrations.map((integration) => (
        <li key={integration.id} className="list-item-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-break text-zinc-100">{integration.displayName}</p>
              <p className="mt-0.5 text-xs leading-snug text-break text-zinc-500">
                {integration.description}
              </p>
            </div>
            <span className="badge shrink-0 capitalize">{integration.authType.replace("_", " ")}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="badge badge-muted normal-case">
              {integration.triggers.length} triggers
            </span>
            <span className="badge badge-muted normal-case">
              {integration.actions.length} actions
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
