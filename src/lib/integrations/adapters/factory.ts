import { BaseIntegrationAdapter } from "@/lib/integrations/adapters/base-adapter";
import type { IntegrationAdapter } from "@/lib/integrations/adapters/types";
import { getIntegrationById } from "@/lib/integrations/registry/definitions";

export function createStubAdapter(integrationId: string): IntegrationAdapter {
  const definition = getIntegrationById(integrationId);
  if (!definition) {
    throw new Error(`Integration definition missing: ${integrationId}`);
  }

  const def = definition;

  return new (class extends BaseIntegrationAdapter {
    constructor() {
      super(def);
    }
  })();
}
