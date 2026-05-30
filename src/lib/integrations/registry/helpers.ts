import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry/definitions";

/** Collects valid action ids referenced in AppSpec workflows for given integrations */
export function collectValidActionRefs(integrationIds: string[]): Set<string> {
  const refs = new Set<string>();
  for (const integrationId of integrationIds) {
    const def = INTEGRATION_REGISTRY.find((i) => i.id === integrationId);
    if (!def) continue;
    for (const action of def.actions) {
      refs.add(action.id);
      refs.add(`${integrationId}:${action.id}`);
    }
  }
  return refs;
}

export function collectValidTriggerIds(integrationIds: string[]): Set<string> {
  const ids = new Set<string>();
  for (const integrationId of integrationIds) {
    const def = INTEGRATION_REGISTRY.find((i) => i.id === integrationId);
    if (!def) continue;
    for (const trigger of def.triggers) {
      ids.add(trigger.id);
    }
  }
  return ids;
}

/** Parses workflow step references: `integrationId:actionId` or bare `actionId` */
export function parseWorkflowStepRef(
  step: string,
  integrationIds: string[],
): { integrationId: string; actionId: string } | null {
  if (step.includes(":")) {
    const [integrationId, actionId] = step.split(":", 2);
    if (integrationId && actionId) {
      return { integrationId, actionId };
    }
    return null;
  }

  for (const integrationId of integrationIds) {
    const def = INTEGRATION_REGISTRY.find((i) => i.id === integrationId);
    const action = def?.actions.find((a) => a.id === step);
    if (action) {
      return { integrationId, actionId: action.id };
    }
  }

  return null;
}
