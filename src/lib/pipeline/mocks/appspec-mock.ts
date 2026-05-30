import {
  buildDefaultWorkflowStub,
  pickPrimaryEntity,
} from "@/lib/pipeline/appspec/workflow-fallback";
import type {
  AppIntent,
  AppSpec,
  DataSchema,
  EntityPermission,
  IntegrationHook,
  PageSpec,
} from "@/types/domain";

export function buildMockAppSpec(
  intent: AppIntent,
  dataSchema: DataSchema,
  userPrompt = "",
): AppSpec {
  const pages: PageSpec[] = [
    {
      id: "page-dashboard",
      name: "Dashboard",
      route: "/dashboard",
      description: "Overview metrics and recent activity",
      entities: dataSchema.entities.map((e) => e.name),
    },
    ...dataSchema.entities.map((entity) => ({
      id: `page-${entity.tableName}`,
      name: entity.name,
      route: `/${entity.tableName.replace(/_/g, "-")}`,
      description: `Manage ${entity.name} records`,
      entities: [entity.name],
    })),
  ];

  const apiEndpoints = dataSchema.entities.flatMap((entity) => [
    {
      id: `api-list-${entity.tableName}`,
      method: "GET" as const,
      path: `/api/${entity.tableName}`,
      description: `List ${entity.name} records`,
      authRequired: true,
      boundEntity: entity.name,
    },
    {
      id: `api-create-${entity.tableName}`,
      method: "POST" as const,
      path: `/api/${entity.tableName}`,
      description: `Create ${entity.name} record`,
      authRequired: true,
      boundEntity: entity.name,
    },
  ]);

  const integrationDefaults: Record<string, IntegrationHook> = {
    slack: {
      integrationId: "slack",
      trigger: "message.posted",
      action: "message.send",
      config: {},
    },
    "whatsapp-twilio": {
      integrationId: "whatsapp-twilio",
      trigger: "message.received",
      action: "message.send",
      config: {},
    },
    gmail: {
      integrationId: "gmail",
      trigger: "email.received",
      action: "email.send",
      config: {},
    },
    stripe: {
      integrationId: "stripe",
      trigger: "payment.succeeded",
      action: "payment.create",
      config: {},
    },
    jira: {
      integrationId: "jira",
      trigger: "issue.created",
      action: "issue.create",
      config: {},
    },
  };

  const integrations: IntegrationHook[] = intent.integrationsRequested
    .filter((id) => integrationDefaults[id])
    .map((id) => integrationDefaults[id] as IntegrationHook);

  const permissions: EntityPermission[] = dataSchema.entities.flatMap((entity) => [
    { entity: entity.name, role: "admin", actions: ["read", "write", "delete"] },
    { entity: entity.name, role: "user", actions: ["read", "write"] },
  ]);

  const primaryEntity = pickPrimaryEntity(intent, dataSchema, userPrompt);
  const workflows =
    integrations.length > 0
      ? intent.integrationsRequested
          .filter((id) => integrationDefaults[id])
          .map((integrationId) =>
            buildDefaultWorkflowStub(integrationId, primaryEntity, dataSchema, userPrompt),
          )
      : [];

  return {
    version: "1.0",
    name: intent.appName,
    description: intent.summary,
    intent,
    dataSchema,
    pages,
    apiEndpoints,
    auth: {
      strategy: "jwt",
      roles: ["admin", "user"],
      publicRoutes: ["/login", "/register"],
      permissions,
    },
    integrations,
    workflows,
  };
}
