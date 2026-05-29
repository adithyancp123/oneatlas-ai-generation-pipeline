import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import type { AppSpec, ApiEndpoint, IntegrationHook } from "@/types/domain";
import type { ValidationError } from "@/types/job";

export interface ConsistencyRepairResult {
  repaired: boolean;
  spec: AppSpec;
  fixedCodes: string[];
}

export function repairConsistency(spec: AppSpec, errors: ValidationError[]): ConsistencyRepairResult {
  let repaired = false;
  const fixedCodes: string[] = [];
  let next = spec;

  const registryIds = new Set(INTEGRATION_REGISTRY.map((i) => i.id));

  for (const error of errors) {
    if (error.code === "page_without_endpoint") {
      const page = next.pages.find((p) => error.path.includes(p.id));
      if (page) {
        const endpoint: ApiEndpoint = {
          id: `api-repair-${page.id}`,
          method: "GET",
          path: `/api${page.route}`,
          description: `List ${page.name} (repair-generated)`,
          authRequired: true,
        };
        next = { ...next, apiEndpoints: [...next.apiEndpoints, endpoint] };
        repaired = true;
        fixedCodes.push("consistency_add_endpoint");
      }
    }

    if (error.code === "integration_not_in_registry") {
      next = {
        ...next,
        integrations: next.integrations.filter((h) => registryIds.has(h.integrationId)),
      };
      repaired = true;
      fixedCodes.push("consistency_remove_unknown_integration");
    }

    if (error.code === "integration_invalid_action" || error.code === "integration_invalid_trigger") {
      next = {
        ...next,
        integrations: next.integrations.map((hook) => normalizeHook(hook)),
      };
      repaired = true;
      fixedCodes.push("consistency_normalize_integration");
    }

    if (error.code === "auth_roles_required") {
      next = {
        ...next,
        auth: { ...next.auth, roles: next.auth.roles.length > 0 ? next.auth.roles : ["user", "admin"] },
      };
      repaired = true;
      fixedCodes.push("consistency_default_roles");
    }

    if (error.code === "relation_not_bidirectional") {
      repaired = true;
      fixedCodes.push("consistency_relation_flagged");
    }
  }

  return { repaired, spec: next, fixedCodes };
}

function normalizeHook(hook: IntegrationHook): IntegrationHook {
  const def = INTEGRATION_REGISTRY.find((i) => i.id === hook.integrationId);
  if (!def) return hook;

  const action = def.actions[0]?.id ?? hook.action;
  const trigger = def.triggers[0]?.id ?? hook.trigger;

  return {
    ...hook,
    action: def.actions.some((a) => a.id === hook.action) ? hook.action : action,
    trigger: def.triggers.some((t) => t.id === hook.trigger) ? hook.trigger : trigger,
  };
}
