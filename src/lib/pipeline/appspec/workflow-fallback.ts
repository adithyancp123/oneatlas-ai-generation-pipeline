import { getIntegrationAction, getIntegrationById } from "@/lib/integrations/registry/definitions";
import type { AppIntent, AppSpec, DataSchema, IntegrationHook, WorkflowStub } from "@/types/domain";

/** Prefer Deal for CRM / deal-close prompts; otherwise first schema entity. */
export function pickPrimaryEntity(
  intent: AppIntent,
  dataSchema: DataSchema,
  userPrompt: string,
): string {
  const names = dataSchema.entities.map((e) => e.name);
  if (/deal/i.test(userPrompt) && names.includes("Deal")) return "Deal";
  if (intent.appType === "crm" && names.includes("Deal")) return "Deal";
  return names[0] ?? "Resource";
}

function buildPayloadMapping(
  integrationId: string,
  actionId: string,
  primaryEntity: string,
  dataSchema: DataSchema,
  userPrompt: string,
): Record<string, string> {
  const entity = dataSchema.entities.find((e) => e.name === primaryEntity);
  const fieldNames = entity?.fields.map((f) => f.name) ?? [];
  const actionDef = getIntegrationAction(integrationId, actionId);
  const mapping: Record<string, string> = {};

  if (/deal.*clos|clos.*deal|deal closes/i.test(userPrompt)) {
    mapping.condition = "status === 'closed'";
  }

  if (actionDef) {
    for (const key of Object.keys(actionDef.inputSchema)) {
      if (key === "body" || key === "message") {
        mapping[key] = `Deal closed: {{${primaryEntity}.name}}`;
      } else if (key === "to") {
        mapping[key] = `{{${primaryEntity}.contact_phone}}`;
      } else if (fieldNames.includes(key)) {
        mapping[key] = `{{${primaryEntity}.${key}}}`;
      } else {
        mapping[key] = `{{${primaryEntity}.id}}`;
      }
    }
  }

  if (Object.keys(mapping).length === 0) {
    mapping.target = primaryEntity;
  }

  return mapping;
}

export function buildDefaultWorkflowStub(
  integrationId: string,
  primaryEntity: string,
  dataSchema: DataSchema,
  userPrompt: string,
): WorkflowStub {
  const def = getIntegrationById(integrationId);
  const registryTrigger = def?.triggers[0]?.id ?? "message.received";
  const actionId = def?.actions[0]?.id ?? "message.send";
  const dealClose = /deal.*clos|clos.*deal|deal closes/i.test(userPrompt);
  const triggerMetaEvent = dealClose ? "status_changed" : registryTrigger;

  return {
    id: `wf-${integrationId}-${primaryEntity.toLowerCase()}`,
    name: `${def?.displayName ?? integrationId} — ${primaryEntity} notification`,
    trigger: registryTrigger,
    triggerMeta: {
      entity: primaryEntity,
      event: triggerMetaEvent,
    },
    steps: [`${integrationId}:${actionId}`],
    stepMeta: [
      {
        integrationId,
        actionId,
        payloadMapping: buildPayloadMapping(
          integrationId,
          actionId,
          primaryEntity,
          dataSchema,
          userPrompt,
        ),
      },
    ],
  };
}

function ensureIntegrationHooks(
  spec: AppSpec,
  integrationIds: string[],
): IntegrationHook[] {
  const hooks = [...spec.integrations];
  const existing = new Set(hooks.map((h) => h.integrationId));

  for (const integrationId of integrationIds) {
    if (existing.has(integrationId)) continue;
    const def = getIntegrationById(integrationId);
    const trigger = def?.triggers[0]?.id ?? "message.received";
    const action = def?.actions[0]?.id ?? "message.send";
    hooks.push({ integrationId, trigger, action, config: {} });
    existing.add(integrationId);
  }

  return hooks;
}

/**
 * When integrations were requested but the model returned no workflows,
 * synthesize one workflow stub per integration from the registry.
 */
export function ensureWorkflowStubs(spec: AppSpec, userPrompt: string): AppSpec {
  const requested = spec.intent.integrationsRequested.filter((id) =>
    Boolean(getIntegrationById(id)),
  );

  if (spec.workflows.length > 0 || requested.length === 0) {
    return spec;
  }

  const primaryEntity = pickPrimaryEntity(spec.intent, spec.dataSchema, userPrompt);
  const workflows = requested.map((integrationId) =>
    buildDefaultWorkflowStub(integrationId, primaryEntity, spec.dataSchema, userPrompt),
  );
  const integrations = ensureIntegrationHooks(spec, requested);

  return {
    ...spec,
    integrations,
    workflows,
  };
}

export function buildAppSpecGenerationPrompt(
  userPrompt: string,
  intent: AppIntent,
  dataSchema: DataSchema,
): string {
  const integrationList =
    intent.integrationsRequested.length > 0
      ? intent.integrationsRequested.join(", ")
      : "none";

  return [
    userPrompt,
    "",
    "Intent (use for integrations and workflows):",
    JSON.stringify(
      {
        appName: intent.appName,
        appType: intent.appType,
        integrationsRequested: intent.integrationsRequested,
        features: intent.features,
        entities: intent.entities.map((e) => e.name),
      },
      null,
      2,
    ),
    "",
    "Data schema:",
    JSON.stringify(dataSchema),
    "",
    "AppSpec generation requirements:",
    "- Return a complete AppSpec JSON object.",
    `- integrationsRequested: [${integrationList}] — include a matching entry in integrations[] for each id.`,
    intent.integrationsRequested.length > 0
      ? `- Create at least one workflow stub in workflows[] for EACH integrationsRequested id (${integrationList}).`
      : "- workflows[] may be empty when no integrations are requested.",
    "- Each workflow must include: name, trigger (registry trigger id), triggerMeta.entity, triggerMeta.event, steps[], stepMeta[] with integrationId, actionId, payloadMapping.",
    "- For deal-close / notification prompts, use triggerMeta.event status_changed and payloadMapping.condition status === 'closed' when appropriate.",
  ].join("\n");
}
