import type { ApiEndpoint, DataSchema, EntitySchema } from "@/types/domain";

export function buildEntityRefSets(schema: DataSchema): {
  names: Set<string>;
  tables: Set<string>;
} {
  return {
    names: new Set(schema.entities.map((e) => e.name)),
    tables: new Set(schema.entities.map((e) => e.tableName)),
  };
}

/** Entity reference may be display name or snake_case table name */
export function entityRefExists(ref: string, names: Set<string>, tables: Set<string>): boolean {
  return names.has(ref) || tables.has(ref);
}

export function resolveEntityByRef(
  ref: string,
  entities: EntitySchema[],
): EntitySchema | undefined {
  return entities.find((e) => e.name === ref || e.tableName === ref);
}

/** True when an endpoint is bound to the same entity (boundEntity or path/table match). */
export function endpointMatchesEntity(
  entityName: string,
  apiEndpoints: Pick<ApiEndpoint, "path" | "boundEntity">[],
  entityTables: Map<string, string>,
): boolean {
  const table = entityTables.get(entityName);
  if (apiEndpoints.some((ep) => ep.boundEntity === entityName)) return true;
  if (table && apiEndpoints.some((ep) => ep.path.includes(table))) return true;
  return false;
}

/** Page must list at least one entity and have ≥1 API endpoint for a listed entity. */
export function pageHasMatchingEndpoint(
  pageEntityNames: string[],
  apiEndpoints: Pick<ApiEndpoint, "path" | "boundEntity">[],
  entityTables: Map<string, string>,
): boolean {
  if (pageEntityNames.length === 0) return false;
  return pageEntityNames.some((entityName) =>
    endpointMatchesEntity(entityName, apiEndpoints, entityTables),
  );
}
