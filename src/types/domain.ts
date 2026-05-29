/** Core domain types — mirrored by Zod schemas in lib/pipeline/validators */

export type AppType =
  | "crm"
  | "ecommerce"
  | "saas"
  | "internal_tool"
  | "marketplace"
  | "other";

export interface ExtractedEntity {
  name: string;
  description: string;
}

export interface AppIntent {
  appName: string;
  appType: AppType;
  summary: string;
  goals: string[];
  actors: string[];
  constraints: string[];
  entities: ExtractedEntity[];
  integrationsRequested: string[];
  assumptions: string[];
  features: string[];
  /** Always false — vague prompts are handled via assumptions[] */
  clarificationRequired: false;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "uuid"
  | "json"
  | "reference";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  description: string;
}

export interface RelationSchema {
  name: string;
  fromEntity: string;
  toEntity: string;
  cardinality: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface EntitySchema {
  /** snake_case table name */
  tableName: string;
  name: string;
  description: string;
  fields: FieldSchema[];
  relations: RelationSchema[];
}

export interface DataSchema {
  entities: EntitySchema[];
}

export interface PageSpec {
  id: string;
  name: string;
  route: string;
  description: string;
  entities: string[];
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  authRequired: boolean;
}

export interface AuthRules {
  strategy: "none" | "session" | "jwt" | "oauth";
  roles: string[];
  publicRoutes: string[];
}

export interface IntegrationHook {
  integrationId: string;
  trigger: string;
  action: string;
  config: Record<string, string>;
}

export interface WorkflowStub {
  id: string;
  name: string;
  steps: string[];
  trigger: string;
}

export interface AppSpec {
  version: "1.0";
  name: string;
  description: string;
  intent: AppIntent;
  dataSchema: DataSchema;
  pages: PageSpec[];
  apiEndpoints: ApiEndpoint[];
  auth: AuthRules;
  integrations: IntegrationHook[];
  workflows: WorkflowStub[];
}
