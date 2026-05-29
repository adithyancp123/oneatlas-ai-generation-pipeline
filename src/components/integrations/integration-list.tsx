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
      <EmptyState title="Loading integrations" description="Fetching connector registry…" />
    );
  }

  return (
    <ul className="space-y-2">
      {integrations.map((integration) => (
        <li key={integration.id} className="list-item-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100">{integration.displayName}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{integration.description}</p>
            </div>
            <span className="badge shrink-0 capitalize">{integration.authType.replace("_", " ")}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
