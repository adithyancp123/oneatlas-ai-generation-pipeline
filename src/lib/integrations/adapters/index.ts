import { createStubAdapter } from "@/lib/integrations/adapters/factory";
import type { IntegrationAdapter } from "@/lib/integrations/adapters/types";

export type { IntegrationAdapter, PayloadValidationResult } from "@/lib/integrations/adapters/types";
export { BaseIntegrationAdapter } from "@/lib/integrations/adapters/base-adapter";
export { createStubAdapter } from "@/lib/integrations/adapters/factory";

export const slackAdapter = createStubAdapter("slack");
export const whatsappAdapter = createStubAdapter("whatsapp-twilio");
export const gmailAdapter = createStubAdapter("gmail");
export const stripeAdapter = createStubAdapter("stripe");
export const jiraAdapter = createStubAdapter("jira");

export const INTEGRATION_ADAPTERS: Record<string, IntegrationAdapter> = {
  slack: slackAdapter,
  "whatsapp-twilio": whatsappAdapter,
  gmail: gmailAdapter,
  stripe: stripeAdapter,
  jira: jiraAdapter,
};

export function getIntegrationAdapter(integrationId: string): IntegrationAdapter | undefined {
  return INTEGRATION_ADAPTERS[integrationId];
}
