import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import { repairOrphanPages } from "@/lib/pipeline/repair/strategies/orphan-pages";
import type { AppSpec, DataSchema, IntegrationHook } from "@/types/domain";
import type { ValidationError } from "@/types/job";

export interface ConsistencyRepairResult {
  repaired: boolean;
  spec: AppSpec;
  fixedCodes: string[];
  /** Reviewer-facing notes (placeholder endpoints, etc.) */
  repairNotes: string[];
}

function enrichApiBoundEntities(spec: AppSpec): AppSpec {
  return {
    ...spec,
    apiEndpoints: spec.apiEndpoints.map((ep) => {
      if (ep.boundEntity) return ep;
      const match = spec.dataSchema.entities.find((e) => ep.path.includes(e.tableName));
      return match ? { ...ep, boundEntity: match.name } : ep;
    }),
  };
}

export function repairConsistency(
  spec: AppSpec,
  errors: ValidationError[],
  canonicalDataSchema?: DataSchema,
): ConsistencyRepairResult {
  let repaired = false;
  const fixedCodes: string[] = [];
  const repairNotes: string[] = [];
  let next = enrichApiBoundEntities(spec);

  const registryIds = new Set(INTEGRATION_REGISTRY.map((i) => i.id));

  for (const error of errors) {
    if (error.code === "dataschema_stage_mismatch" && canonicalDataSchema) {
      next = { ...next, dataSchema: canonicalDataSchema };
      repaired = true;
      fixedCodes.push("consistency_align_dataschema");
    }

    if (error.code === "page_without_endpoint") {
      const orphanResult = repairOrphanPages(next);
      if (orphanResult.repaired) {
        next = orphanResult.spec;
        repaired = true;
        fixedCodes.push("consistency_orphan_page_endpoint");
        repairNotes.push(...orphanResult.notes);
      }
    }

    if (error.code === "api_invalid_bound_entity") {
      next = {
        ...next,
        apiEndpoints: next.apiEndpoints.map((ep) => {
          if (!ep.boundEntity) return ep;
          const valid = next.dataSchema.entities.some((e) => e.name === ep.boundEntity);
          if (valid) return ep;
          const match = next.dataSchema.entities.find((e) => ep.path.includes(e.tableName));
          if (!match) {
            const rest = { ...ep };
            delete rest.boundEntity;
            return rest;
          }
          return { ...ep, boundEntity: match.name };
        }),
      };
      repaired = true;
      fixedCodes.push("consistency_fix_api_bound_entity");
    }

    if (error.code === "page_api_bound_mismatch") {
      next = enrichApiBoundEntities(next);
      const orphanResult = repairOrphanPages(next);
      if (orphanResult.repaired) {
        next = orphanResult.spec;
        repaired = true;
        fixedCodes.push("consistency_orphan_page_endpoint");
        repairNotes.push(...orphanResult.notes);
      }
      repaired = true;
      fixedCodes.push("consistency_enrich_api_bound_entity");
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

    if (error.code === "integration_invalid_config") {
      next = {
        ...next,
        integrations: next.integrations.map((hook) => ({
          ...hook,
          config: {},
        })),
      };
      repaired = true;
      fixedCodes.push("consistency_clear_integration_config");
    }

    if (error.code === "workflow_invalid_trigger") {
      const firstHook = next.integrations[0];
      const def = firstHook
        ? INTEGRATION_REGISTRY.find((i) => i.id === firstHook.integrationId)
        : undefined;
      const fallbackTrigger = def?.triggers[0]?.id;
      if (fallbackTrigger) {
        next = {
          ...next,
          workflows: next.workflows.map((wf) => ({
            ...wf,
            trigger: def?.triggers.some((t) => t.id === wf.trigger) ? wf.trigger : fallbackTrigger,
          })),
        };
        repaired = true;
        fixedCodes.push("consistency_normalize_workflow_trigger");
      }
    }

    if (error.code === "workflow_invalid_action" || error.code === "workflow_invalid_step_action") {
      if (next.integrations.length > 0) {
        next = {
          ...next,
          workflows: next.workflows.map((wf) => ({
            ...wf,
            steps: next.integrations.map((h) => `${h.integrationId}:${h.action}`),
            stepMeta: next.integrations.map((h) => ({
              integrationId: h.integrationId,
              actionId: h.action,
            })),
          })),
        };
        repaired = true;
        fixedCodes.push("consistency_normalize_workflow_steps");
      }
    }

    if (error.code === "workflow_invalid_trigger_entity" && next.integrations[0]) {
      const entityName = next.dataSchema.entities[0]?.name;
      if (entityName) {
        next = {
          ...next,
          workflows: next.workflows.map((wf) => ({
            ...wf,
            triggerMeta: { entity: entityName, event: wf.triggerMeta?.event ?? wf.trigger },
          })),
        };
        repaired = true;
        fixedCodes.push("consistency_normalize_workflow_trigger_meta");
      }
    }

    if (error.code === "auth_roles_required") {
      next = {
        ...next,
        auth: { ...next.auth, roles: next.auth.roles.length > 0 ? next.auth.roles : ["user", "admin"] },
      };
      repaired = true;
      fixedCodes.push("consistency_default_roles");
    }

    if (error.code === "auth_permission_unknown_role") {
      const defaultRole = next.auth.roles[0] ?? "user";
      next = {
        ...next,
        auth: {
          ...next.auth,
          permissions: (next.auth.permissions ?? []).map((p) => ({
            ...p,
            role: next.auth.roles.includes(p.role) ? p.role : defaultRole,
          })),
        },
      };
      repaired = true;
      fixedCodes.push("consistency_fix_permission_role");
    }

    if (error.code === "auth_permission_unknown_entity") {
      next = {
        ...next,
        auth: {
          ...next.auth,
          permissions: (next.auth.permissions ?? []).filter((p) =>
            next.dataSchema.entities.some((e) => e.name === p.entity),
          ),
        },
      };
      repaired = true;
      fixedCodes.push("consistency_remove_invalid_permission");
    }
  }

  const finalOrphanPass = repairOrphanPages(next);
  if (finalOrphanPass.repaired) {
    next = finalOrphanPass.spec;
    repaired = true;
    if (!fixedCodes.includes("consistency_orphan_page_endpoint")) {
      fixedCodes.push("consistency_orphan_page_endpoint");
    }
    for (const note of finalOrphanPass.notes) {
      if (!repairNotes.includes(note)) repairNotes.push(note);
    }
  }

  return { repaired, spec: next, fixedCodes, repairNotes };
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
