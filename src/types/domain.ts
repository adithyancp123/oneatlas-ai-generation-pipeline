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

export type AmbiguityLevel = "low" | "medium" | "high";

export interface SkippedIntegration {
  integration: string;
  reason: string;
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
  /** Reviewer-visible notices (unsupported integrations, scope narrowing, etc.) */
  warnings: string[];
  features: string[];
  /** Always false — vague prompts are handled via assumptions[] */
  clarificationRequired: false;
  /** Heuristic 0–1 score for how well the prompt constrains generation */
  confidence?: number | undefined;
  ambiguityLevel?: AmbiguityLevel | undefined;
  /** Why assumptions were used instead of blocking clarification */
  clarificationReason?: string | undefined;
  /** Domains inferred from prompt keywords (when multiple, scope is narrowed) */
  detectedDomains?: string[] | undefined;
  /** Dominant domain chosen for MVP-first output when conflicts exist */
  prioritizedDomain?: string | undefined;
  /** Deterministic explanation of domain prioritization */
  prioritizationReason?: string | undefined;
  /** All integration names detected in the user prompt */
  requestedIntegrations?: string[] | undefined;
  /** Subset of requested integrations present in the registry */
  supportedIntegrations?: string[] | undefined;
  /** Requested integrations excluded from the registry */
  skippedIntegrations?: SkippedIntegration[] | undefined;
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
  /** Optional explicit entity binding (entity display name) */
  boundEntity?: string | undefined;
}

export interface EntityPermission {
  entity: string;
  role: string;
  actions: string[];
}

export interface AuthRules {
  strategy: "none" | "session" | "jwt" | "oauth";
  roles: string[];
  publicRoutes: string[];
  /** Lightweight entity-level permissions (not a full RBAC engine) */
  permissions?: EntityPermission[] | undefined;
}

export interface IntegrationHook {
  integrationId: string;
  trigger: string;
  action: string;
  config: Record<string, string>;
}

export interface WorkflowTriggerMeta {
  entity?: string | undefined;
  event?: string | undefined;
}

export interface WorkflowStepMeta {
  integrationId?: string | undefined;
  actionId?: string | undefined;
  payloadMapping?: Record<string, string> | undefined;
}

export interface WorkflowStub {
  id: string;
  name: string;
  steps: string[];
  trigger: string;
  /** Optional richer trigger detail — flat `trigger` remains valid */
  triggerMeta?: WorkflowTriggerMeta | undefined;
  /** Optional per-step integration mapping — aligns with `steps[]` by index */
  stepMeta?: WorkflowStepMeta[] | undefined;
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
