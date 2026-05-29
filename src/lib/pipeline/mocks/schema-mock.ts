import type { AppIntent, DataSchema, EntitySchema, FieldSchema, RelationSchema } from "@/types/domain";

const TENANT_FIELD: FieldSchema = {
  name: "tenant_id",
  type: "uuid",
  required: true,
  unique: false,
  description: "Tenant identifier for multi-tenant isolation",
};

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function buildEntity(intentEntity: { name: string; description: string }): EntitySchema {
  const tableName = toSnakeCase(intentEntity.name);
  const idField: FieldSchema = {
    name: "id",
    type: "uuid",
    required: true,
    unique: true,
    description: `Primary key for ${intentEntity.name}`,
  };

  const nameField: FieldSchema = {
    name: "name",
    type: "string",
    required: true,
    unique: false,
    description: `Display name for ${intentEntity.name}`,
  };

  return {
    tableName,
    name: intentEntity.name,
    description: intentEntity.description,
    fields: [idField, TENANT_FIELD, nameField],
    relations: [],
  };
}

export function buildMockDataSchema(intent: AppIntent): DataSchema {
  const entities = intent.entities.map(buildEntity);

  if (intent.appType === "crm" && entities.length >= 2) {
    const contact = entities.find((e) => e.name === "Contact");
    const deal = entities.find((e) => e.name === "Deal");
    const account = entities.find((e) => e.name === "Account");

    if (contact && deal) {
      const rel: RelationSchema = {
        name: "contact_deals",
        fromEntity: contact.tableName,
        toEntity: deal.tableName,
        cardinality: "one-to-many",
      };
      contact.relations.push(rel);
      deal.relations.push({
        name: "deal_contact",
        fromEntity: deal.tableName,
        toEntity: contact.tableName,
        cardinality: "one-to-many",
      });
    }

    if (account && contact) {
      account.relations.push({
        name: "account_contacts",
        fromEntity: account.tableName,
        toEntity: contact.tableName,
        cardinality: "one-to-many",
      });
      contact.relations.push({
        name: "contact_account",
        fromEntity: contact.tableName,
        toEntity: account.tableName,
        cardinality: "one-to-many",
      });
    }
  }

  return { entities };
}
