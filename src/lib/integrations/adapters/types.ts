import type { IntegrationDefinition } from "@/types/integrations";

export interface IntegrationAdapter {
  readonly definition: IntegrationDefinition;
  isConfigured(): boolean;
  validateConfig(config: Record<string, string>): { valid: boolean; errors: string[] };
}
