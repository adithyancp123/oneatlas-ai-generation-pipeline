import { pageHasMatchingEndpoint } from "@/lib/pipeline/validators/entity-refs";
import type { ApiEndpoint, AppSpec, EntitySchema } from "@/types/domain";

export interface OrphanPageRepairResult {
  repaired: boolean;
  spec: AppSpec;
  notes: string[];
}

function placeholderEndpointForEntity(
  entity: EntitySchema,
  existing: ApiEndpoint[],
): ApiEndpoint | null {
  const path = `/api/${entity.tableName}`;
  const id = `api-placeholder-${entity.tableName}`;

  const alreadyExists = existing.some(
    (ep) =>
      ep.method === "GET" &&
      ep.path === path &&
      ep.boundEntity === entity.name,
  );
  if (alreadyExists) return null;

  return {
    id,
    method: "GET",
    path,
    description: "Auto-generated placeholder endpoint for orphan page",
    authRequired: true,
    boundEntity: entity.name,
  };
}

/**
 * Deterministic orphan recovery: pages whose entities lack any API binding
 * receive a minimal GET placeholder (no business logic, no schema changes).
 * Idempotent — safe to run after other consistency fixes.
 */
export function repairOrphanPages(spec: AppSpec): OrphanPageRepairResult {
  const entityNameToTable = new Map(
    spec.dataSchema.entities.map((entity) => [entity.name, entity.tableName]),
  );
  const notes: string[] = [];
  let apiEndpoints = [...spec.apiEndpoints];
  let repaired = false;

  for (const page of spec.pages) {
    if (page.route === "/dashboard") continue;

    for (const entityName of page.entities) {
      const entity = spec.dataSchema.entities.find((item) => item.name === entityName);
      if (!entity) continue;

      if (pageHasMatchingEndpoint([entityName], apiEndpoints, entityNameToTable)) {
        continue;
      }

      const placeholder = placeholderEndpointForEntity(entity, apiEndpoints);
      if (!placeholder) continue;

      apiEndpoints = [...apiEndpoints, placeholder];
      repaired = true;
      notes.push(
        `Placeholder endpoint created for orphan page "${page.name}" (${entity.name}) at ${placeholder.path}`,
      );
    }
  }

  return {
    repaired,
    spec: { ...spec, apiEndpoints },
    notes,
  };
}
