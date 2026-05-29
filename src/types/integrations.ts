export type IntegrationAuthType =
  | "oauth2"
  | "api_key"
  | "webhook"
  | "service_account"
  | "basic";

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  payloadSchemaId: string;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  payloadSchemaId: string;
}

export interface IntegrationDefinition {
  id: string;
  displayName: string;
  description: string;
  authType: IntegrationAuthType;
  triggers: IntegrationTrigger[];
  actions: IntegrationAction[];
  requiredEnvKeys: string[];
}

export interface IntegrationConnection {
  integrationId: string;
  enabled: boolean;
  configuredAt: string | null;
}
