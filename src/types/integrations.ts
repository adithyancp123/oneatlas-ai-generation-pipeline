export type IntegrationAuthType =
  | "oauth2"
  | "api_key"
  | "webhook"
  | "service_account"
  | "basic";

/** Typed field descriptor for integration payload shapes */
export type PayloadFieldType = "string" | "number" | "boolean" | "object" | "array";

export type PayloadShape = Record<string, PayloadFieldType>;

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  payloadSchemaId: string;
  inputSchema: PayloadShape;
  outputSchema: PayloadShape;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  payloadSchemaId: string;
  inputSchema: PayloadShape;
  outputSchema: PayloadShape;
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

export interface IntegrationExecutionResult {
  success: boolean;
  simulated: true;
  timestamp: string;
  integrationId: string;
  operationId: string;
  operationKind: "trigger" | "action";
  [key: string]: unknown;
}
