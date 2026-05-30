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

export function pageHasMatchingEndpoint(
  pageEntityNames: string[],
  apiEndpoints: Pick<ApiEndpoint, "path" | "boundEntity">[],
  entityTables: Map<string, string>,
): boolean {
  for (const entityName of pageEntityNames) {
    const table = entityTables.get(entityName);
    const boundMatch = apiEndpoints.some((ep) => ep.boundEntity === entityName);
    if (boundMatch) return true;
    if (table && apiEndpoints.some((ep) => ep.path.includes(table))) return true;
  }
  return false;
}
