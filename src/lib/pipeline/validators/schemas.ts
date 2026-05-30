import { z } from "zod";

export const appTypeSchema = z.enum([
  "crm",
  "ecommerce",
  "saas",
  "internal_tool",
  "marketplace",
  "other",
]);

export const extractedEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});

export const appIntentSchema = z.object({
  appName: z.string().min(1),
  appType: appTypeSchema,
  summary: z.string().min(1),
  goals: z.array(z.string().min(1)).min(1),
  actors: z.array(z.string().min(1)),
  constraints: z.array(z.string()),
  entities: z.array(extractedEntitySchema).min(1),
  integrationsRequested: z.array(z.string()),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
  features: z.array(z.string().min(1)).min(1),
  clarificationRequired: z.literal(false),
  confidence: z.number().min(0).max(1).optional(),
  ambiguityLevel: z.enum(["low", "medium", "high"]).optional(),
  clarificationReason: z.string().min(1).optional(),
  detectedDomains: z.array(z.string().min(1)).optional(),
  prioritizedDomain: z.string().min(1).optional(),
  prioritizationReason: z.string().min(1).optional(),
  requestedIntegrations: z.array(z.string().min(1)).optional(),
  supportedIntegrations: z.array(z.string().min(1)).optional(),
  skippedIntegrations: z
    .array(
      z.object({
        integration: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .optional(),
});

export const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "string",
    "number",
    "boolean",
    "date",
    "email",
    "uuid",
    "json",
    "reference",
  ]),
  required: z.boolean(),
  unique: z.boolean(),
  description: z.string(),
});

export const relationSchema = z.object({
  name: z.string().min(1),
  fromEntity: z.string().min(1),
  toEntity: z.string().min(1),
  cardinality: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

export const entitySchema = z.object({
  tableName: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "tableName must be snake_case"),
  name: z.string().min(1),
  description: z.string(),
  fields: z.array(fieldSchema).min(1),
  relations: z.array(relationSchema),
});

export const dataSchemaSchema = z.object({
  entities: z.array(entitySchema).min(1),
});

export const pageSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().min(1),
  description: z.string(),
  entities: z.array(z.string()),
});

export const apiEndpointSchema = z.object({
  id: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  description: z.string(),
  authRequired: z.boolean(),
  boundEntity: z.string().min(1).optional(),
});

export const entityPermissionSchema = z.object({
  entity: z.string().min(1),
  role: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

export const authRulesSchema = z.object({
  strategy: z.enum(["none", "session", "jwt", "oauth"]),
  roles: z.array(z.string()),
  publicRoutes: z.array(z.string()),
  permissions: z.array(entityPermissionSchema).optional(),
});

export const integrationHookSchema = z.object({
  integrationId: z.string().min(1),
  trigger: z.string().min(1),
  action: z.string().min(1),
  config: z.record(z.string()),
});

export const workflowTriggerMetaSchema = z.object({
  entity: z.string().min(1).optional(),
  event: z.string().min(1).optional(),
});

export const workflowStepMetaSchema = z.object({
  integrationId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  payloadMapping: z.record(z.string()).optional(),
});

export const workflowStubSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  trigger: z.string().min(1),
  triggerMeta: workflowTriggerMetaSchema.optional(),
  stepMeta: z.array(workflowStepMetaSchema).optional(),
});

export const appSpecSchema = z.object({
  version: z.literal("1.0"),
  name: z.string().min(1),
  description: z.string().min(1),
  intent: appIntentSchema,
  dataSchema: dataSchemaSchema,
  pages: z.array(pageSpecSchema).min(1),
  apiEndpoints: z.array(apiEndpointSchema),
  auth: authRulesSchema,
  integrations: z.array(integrationHookSchema),
  workflows: z.array(workflowStubSchema),
});

export const validationErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  field: z.string(),
  path: z.string(),
  stageId: z
    .enum(["intentExtraction", "schemaGeneration", "appSpecGeneration", "repair"])
    .optional(),
});

export const repairLogEntrySchema = z.object({
  strategy: z.enum(["structural", "field", "consistency"]).or(z.string().min(1)),
  errorInput: z.string(),
  inputError: z.string(),
  attempt: z.number().int().positive(),
  outcome: z.enum(["repaired", "escalated", "failed"]),
  latencyMs: z.number().nonnegative(),
  stageId: z.enum([
    "intentExtraction",
    "schemaGeneration",
    "appSpecGeneration",
    "repair",
  ]),
  timestamp: z.string().datetime(),
  errorsFixed: z.number().int().nonnegative(),
});

export const repairLogSchema = z.object({
  jobId: z.string().uuid(),
  entries: z.array(repairLogEntrySchema),
  success: z.boolean(),
});

export const stageLatencySchema = z.object({
  stageId: z.enum([
    "intentExtraction",
    "schemaGeneration",
    "appSpecGeneration",
    "repair",
  ]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
});

export const costBreakdownLineSchema = z.object({
  stageId: z.enum([
    "intentExtraction",
    "schemaGeneration",
    "appSpecGeneration",
    "repair",
  ]),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  estimatedUsd: z.number().nonnegative(),
});

export const costBreakdownSchema = z.object({
  jobId: z.string().uuid(),
  lines: z.array(costBreakdownLineSchema),
  totalUsd: z.number().nonnegative(),
});

export const providerExecutionMetaSchema = z.object({
  provider: z.string(),
  model: z.string(),
  mode: z.enum(["live", "mock", "fallback"]),
  fallbackReason: z.string().optional(),
  latencyMs: z.number().nonnegative().optional(),
});

export const stageProviderExecutionSchema = providerExecutionMetaSchema.extend({
  stageId: z.enum(["intentExtraction", "schemaGeneration", "appSpecGeneration", "repair"]),
});

export const generationJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  prompt: z.string().min(1),
  currentStage: z
    .enum(["intentExtraction", "schemaGeneration", "appSpecGeneration", "repair"])
    .nullable(),
  appSpec: appSpecSchema.nullable(),
  validationErrors: z.array(validationErrorSchema),
  repairLog: repairLogSchema.nullable(),
  cost: costBreakdownSchema.nullable(),
  latencies: z.array(stageLatencySchema),
  providerExecutions: z.array(stageProviderExecutionSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AppIntentInput = z.input<typeof appIntentSchema>;
export type AppSpecInput = z.input<typeof appSpecSchema>;
export type GenerationJobOutput = z.output<typeof generationJobSchema>;
