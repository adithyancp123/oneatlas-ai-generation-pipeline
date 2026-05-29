"use client";

import { useEffect, useState } from "react";
import { fetchIntegrations } from "@/lib/api/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { IntegrationDefinition } from "@/types/integrations";

export function IntegrationList() {
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchIntegrations()
      .then(setIntegrations)
      .catch(() => setError("Failed to load integrations"));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (integrations.length === 0) {
    return <p className="text-sm text-foreground/50">Loading integrations…</p>;
  }

  return (
    <ul className="space-y-3">
      {integrations.map((integration) => (
        <li key={integration.id}>
          <Card className="p-4">
            <CardHeader className="mb-2 p-0">
              <CardTitle className="text-base">{integration.displayName}</CardTitle>
              <CardDescription>{integration.description}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2 text-xs text-foreground/60">
              <span className="rounded border border-foreground/15 px-2 py-0.5 capitalize">
                {integration.authType.replace("_", " ")}
              </span>
              <span>{integration.triggers.length} triggers</span>
              <span>{integration.actions.length} actions</span>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
