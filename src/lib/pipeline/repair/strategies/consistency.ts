import { aiGateway } from "@/lib/ai/gateway";
import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import { closestStringMatch } from "@/lib/pipeline/repair/strategies/fuzzy-match";
import { repairOrphanPages } from "@/lib/pipeline/repair/strategies/orphan-pages";
import { appSpecSchema } from "@/lib/pipeline/validators";
import { buildEntityRefSets, entityRefExists } from "@/lib/pipeline/validators/entity-refs";
import type { AppSpec, DataSchema, IntegrationHook } from "@/types/domain";
import type { ValidationError } from "@/types/job";

export interface ConsistencyRepairResult {
  repaired: boolean;
  spec: AppSpec;
  fixedCodes: string[];
  repairNotes: string[];
  needsLlm: boolean;
  llmPrompt?: string;
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

function mapIntegrationToNearest(id: string): string | null {
  const registryIds = INTEGRATION_REGISTRY.map((i) => i.id);
  return closestStringMatch(id, registryIds);
}

function mapPageEntitiesToNearest(spec: AppSpec): { spec: AppSpec; fixed: boolean; notes: string[] } {
  const entityNames = spec.dataSchema.entities.map((e) => e.name);
  let fixed = false;
  const notes: string[] = [];

  const pages = spec.pages.map((page) => {
    const mapped = page.entities.map((ref) => {
      if (entityNames.includes(ref)) return ref;
      const closest = closestStringMatch(ref, entityNames);
      if (closest) {
        fixed = true;
        notes.push(`Mapped page entity "${ref}" → "${closest}"`);
        return closest;
      }
      return ref;
    });
    return { ...page, entities: mapped };
  });

  return { spec: { ...spec, pages }, fixed, notes };
}

export async function repairConsistency(
  spec: AppSpec,
  errors: ValidationError[],
  canonicalDataSchema?: DataSchema,
  jobId?: string,
): Promise<ConsistencyRepairResult> {
  let repaired = false;
  const fixedCodes: string[] = [];
  const repairNotes: string[] = [];
  let next = enrichApiBoundEntities(spec);
  let needsLlm = false;
  let llmPrompt: string | undefined;

  const registryIds = new Set(INTEGRATION_REGISTRY.map((i) => i.id));
  const { names, tables } = buildEntityRefSets(next.dataSchema);

  for (const error of errors) {
    if (error.code === "dataschema_stage_mismatch" && canonicalDataSchema) {
      next = { ...next, dataSchema: canonicalDataSchema };
      repaired = true;
      fixedCodes.push("consistency_align_dataschema");
    }

    if (error.code === "page_unknown_entity") {
      const mapped = mapPageEntitiesToNearest(next);
      if (mapped.fixed) {
        next = mapped.spec;
        repaired = true;
        fixedCodes.push("consistency_map_page_entity");
        repairNotes.push(...mapped.notes);
      } else {
        needsLlm = true;
        llmPrompt = [
          "A page references an entity that does not exist in dataSchema.entities.",
          `Error: ${error.message}`,
          `Field: ${error.field}`,
          "Return ONLY the corrected pages array JSON.",
        ].join("\n");
      }
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
          const closest = closestStringMatch(
            ep.boundEntity,
            next.dataSchema.entities.map((e) => e.name),
          );
          if (closest) {
            repaired = true;
            fixedCodes.push("consistency_map_api_bound_entity");
            return { ...ep, boundEntity: closest };
          }
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
    }

    if (error.code === "integration_not_in_registry") {
      const hookId = error.field.replace(/^integrations\./, "").split(".")[0] ?? "";
      const nearest = mapIntegrationToNearest(hookId);
      if (nearest) {
        next = {
          ...next,
          integrations: next.integrations.map((hook) =>
            hook.integrationId === hookId ? { ...hook, integrationId: nearest } : hook,
          ),
        };
        repaired = true;
        fixedCodes.push("consistency_map_integration_registry");
        repairNotes.push(`Mapped integration "${hookId}" → registry id "${nearest}"`);
      } else {
        next = {
          ...next,
          integrations: next.integrations.filter((h) => registryIds.has(h.integrationId)),
        };
        repaired = true;
        fixedCodes.push("consistency_remove_unknown_integration");
      }
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

    if (
      error.code === "workflow_invalid_entity" ||
      error.code === "workflow_invalid_trigger_entity"
    ) {
      const badRef = error.field.split(".").pop() ?? "";
      const closest = closestStringMatch(badRef, [...names]);
      if (closest && entityRefExists(closest, names, tables)) {
        next = {
          ...next,
          workflows: next.workflows.map((wf) => ({
            ...wf,
            triggerMeta: {
              ...(wf.triggerMeta ?? {}),
              entity: closest,
              event: wf.triggerMeta?.event ?? wf.trigger,
            },
          })),
        };
        repaired = true;
        fixedCodes.push("consistency_map_workflow_entity");
        repairNotes.push(`Mapped workflow entity "${badRef}" → "${closest}"`);
      } else {
        needsLlm = true;
        llmPrompt = [
          "A workflow references an entity that does not exist in dataSchema.",
          `Error: ${error.message}`,
          "Return ONLY the corrected workflows array JSON with valid triggerMeta.entity values.",
        ].join("\n");
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

  if (needsLlm && llmPrompt && jobId) {
    try {
      const gw = await aiGateway.generateForStage(
        { stageId: "repair", prompt: llmPrompt, metadata: { jobId, repairStrategy: "consistency" } },
        appSpecSchema,
      );
      if (!gw.mock && gw.data && typeof gw.data === "object" && "version" in gw.data) {
        next = gw.data as AppSpec;
        repaired = true;
        fixedCodes.push("consistency_llm_escalation");
        needsLlm = false;
      }
    } catch {
      /* keep needsLlm true */
    }
  }

  return {
    repaired,
    spec: next,
    fixedCodes,
    repairNotes,
    needsLlm,
    ...(llmPrompt !== undefined ? { llmPrompt } : {}),
  };
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
