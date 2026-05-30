import { getIntegrationAction, getIntegrationById } from "@/lib/integrations/registry/definitions";
import type { AppIntent, AppSpec, DataSchema, IntegrationHook, WorkflowStub } from "@/types/domain";

const MESSAGING_STATUS_ENTITIES = ["Task", "Deal", "Order", "Leave", "Ticket"] as const;
const STRIPE_ENTITIES = ["Order", "Payment", "Subscription"] as const;
const EMAIL_ENTITIES = ["Order", "User", "Employee"] as const;
const JIRA_ENTITIES = ["Task", "Issue", "Bug"] as const;

const STATUS_CHANGED_ENTITIES = new Set<string>(["Task", "Deal", "Order", "Leave", "Ticket", "Issue", "Bug"]);
const CREATED_EVENT_ENTITIES = new Set<string>(["User", "Employee", "Contact", "Payment", "Subscription"]);

function schemaEntityNames(dataSchema: DataSchema): string[] {
  return dataSchema.entities.map((e) => e.name);
}

function pickFirstInSchema(candidates: readonly string[], names: string[]): string | undefined {
  for (const name of candidates) {
    if (names.includes(name)) return name;
  }
  return undefined;
}

/**
 * Pick the workflow trigger entity for an integration from the generated DataSchema.
 */
export function pickWorkflowTriggerEntity(
  integrationId: string,
  dataSchema: DataSchema,
  userPrompt: string,
): string {
  const names = schemaEntityNames(dataSchema);
  if (names.length === 0) return "Resource";

  let candidates: readonly string[] | undefined;

  switch (integrationId) {
    case "slack":
    case "whatsapp-twilio":
      candidates = MESSAGING_STATUS_ENTITIES;
      break;
    case "stripe":
      candidates = STRIPE_ENTITIES;
      break;
    case "gmail":
    case "google-workspace":
      candidates = EMAIL_ENTITIES;
      break;
    case "jira":
      candidates = JIRA_ENTITIES;
      break;
    default:
      return names[0]!;
  }

  const matched = pickFirstInSchema(candidates, names);
  if (matched) return matched;

  if (
    (integrationId === "whatsapp-twilio" || integrationId === "slack") &&
    /deal.*clos|clos.*deal|deal closes/i.test(userPrompt) &&
    names.includes("Deal")
  ) {
    return "Deal";
  }

  return names[0]!;
}

/** Map entity name to triggerMeta.event for workflow stubs. */
export function pickWorkflowTriggerEvent(entityName: string): string {
  if (STATUS_CHANGED_ENTITIES.has(entityName)) return "status_changed";
  if (CREATED_EVENT_ENTITIES.has(entityName)) return "created";
  return "created";
}

/** @deprecated Use pickWorkflowTriggerEntity(integrationId, dataSchema, userPrompt) */
export function pickPrimaryEntity(
  _intent: AppIntent,
  dataSchema: DataSchema,
  userPrompt: string,
): string {
  return pickWorkflowTriggerEntity("slack", dataSchema, userPrompt);
}

function buildPayloadMapping(
  integrationId: string,
  actionId: string,
  triggerEntity: string,
  dataSchema: DataSchema,
  userPrompt: string,
): Record<string, string> {
  const entity = dataSchema.entities.find((e) => e.name === triggerEntity);
  const fieldNames = entity?.fields.map((f) => f.name) ?? [];
  const actionDef = getIntegrationAction(integrationId, actionId);
  const mapping: Record<string, string> = {};

  if (
    triggerEntity === "Deal" &&
    /deal.*clos|clos.*deal|deal closes/i.test(userPrompt)
  ) {
    mapping.condition = "status === 'closed'";
  }

  if (actionDef) {
    for (const key of Object.keys(actionDef.inputSchema)) {
      if (key === "body" || key === "message") {
        mapping[key] =
          triggerEntity === "Deal"
            ? `Deal closed: {{${triggerEntity}.name}}`
            : `${triggerEntity} update: {{${triggerEntity}.name}}`;
      } else if (key === "to") {
        mapping[key] = `{{${triggerEntity}.contact_phone}}`;
      } else if (fieldNames.includes(key)) {
        mapping[key] = `{{${triggerEntity}.${key}}}`;
      } else {
        mapping[key] = `{{${triggerEntity}.id}}`;
      }
    }
  }

  if (Object.keys(mapping).length === 0) {
    mapping.target = triggerEntity;
  }

  return mapping;
}

export function buildDefaultWorkflowStub(
  integrationId: string,
  dataSchema: DataSchema,
  userPrompt: string,
): WorkflowStub {
  const def = getIntegrationById(integrationId);
  const registryTrigger = def?.triggers[0]?.id ?? "message.received";
  const actionId = def?.actions[0]?.id ?? "message.send";
  const triggerEntity = pickWorkflowTriggerEntity(integrationId, dataSchema, userPrompt);
  const triggerMetaEvent = pickWorkflowTriggerEvent(triggerEntity);

  return {
    id: `wf-${integrationId}-${triggerEntity.toLowerCase()}`,
    name: `${def?.displayName ?? integrationId} — ${triggerEntity} notification`,
    trigger: registryTrigger,
    triggerMeta: {
      entity: triggerEntity,
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
          triggerEntity,
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

  const workflows = requested.map((integrationId) =>
    buildDefaultWorkflowStub(integrationId, spec.dataSchema, userPrompt),
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
    "- Pick triggerMeta.entity from the data schema (e.g. Task for task apps, Deal for deal-close CRM, not a generic Contact unless that is the only entity).",
    "- For deal-close / notification prompts, use triggerMeta.event status_changed and payloadMapping.condition status === 'closed' when appropriate.",
  ].join("\n");
}
