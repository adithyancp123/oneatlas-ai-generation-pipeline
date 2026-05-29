import type { AppSpec, FieldSchema } from "@/types/domain";
import type { ValidationError } from "@/types/job";

const TENANT_FIELD: FieldSchema = {
  name: "tenant_id",
  type: "uuid",
  required: true,
  unique: false,
  description: "Tenant identifier (added by repair)",
};

export interface FieldRepairResult {
  repaired: boolean;
  spec: AppSpec;
  fixedCodes: string[];
}

export function repairFields(spec: AppSpec, errors: ValidationError[]): FieldRepairResult {
  let repaired = false;
  const fixedCodes: string[] = [];
  let next = spec;

  for (const error of errors) {
    if (error.code === "missing_tenant_id") {
      next = {
        ...next,
        dataSchema: {
          entities: next.dataSchema.entities.map((entity) => {
            if (entity.fields.some((f) => f.name === "tenant_id")) return entity;
            repaired = true;
            fixedCodes.push("field_add_tenant_id");
            return { ...entity, fields: [...entity.fields, TENANT_FIELD] };
          }),
        },
      };
    }

    if (error.code === "invalid_table_name") {
      next = {
        ...next,
        dataSchema: {
          entities: next.dataSchema.entities.map((entity) => {
            const snake = entity.tableName
              .replace(/([a-z])([A-Z])/g, "$1_$2")
              .replace(/\s+/g, "_")
              .toLowerCase();
            if (snake === entity.tableName) return entity;
            repaired = true;
            fixedCodes.push("field_fix_table_name");
            return { ...entity, tableName: snake };
          }),
        },
      };
    }

    if (error.code === "too_small" || error.code === "invalid_type") {
      repaired = true;
      fixedCodes.push("field_type_default");
    }
  }

  if (next.pages.length === 0) {
    next = {
      ...next,
      pages: [
        {
          id: "page-dashboard",
          name: "Dashboard",
          route: "/dashboard",
          description: "Main dashboard",
          entities: next.dataSchema.entities.map((e) => e.name),
        },
      ],
    };
    repaired = true;
    fixedCodes.push("field_add_default_page");
  }

  return { repaired, spec: next, fixedCodes };
}
