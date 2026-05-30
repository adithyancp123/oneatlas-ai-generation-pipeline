import { runRepairEngine } from "@/lib/pipeline/repair/repair-engine";
import { buildMockAppSpec } from "@/lib/pipeline/mocks/appspec-mock";
import { buildMockIntent } from "@/lib/pipeline/mocks/intent-mock";
import { buildMockDataSchema } from "@/lib/pipeline/mocks/schema-mock";
import { validateAppSpec } from "@/lib/pipeline/validators/validation-engine";
import type { AppSpec } from "@/types/domain";

function mutateSpec(base: AppSpec, mutator: (spec: AppSpec) => void): AppSpec {
  const spec = structuredClone(base);
  mutator(spec);
  return spec;
}

interface AdversarialCase {
  id: string;
  mutate: (spec: AppSpec) => void;
  expectCodesBefore: string[];
}

async function runCase(testCase: AdversarialCase): Promise<{
  id: string;
  passed: boolean;
  codesBefore: string[];
  codesAfter: string[];
  repairSuccess: boolean;
  repairEntries: number;
}> {
  const intent = buildMockIntent("CRM with contacts");
  const schema = buildMockDataSchema(intent);
  const base = buildMockAppSpec(intent, schema);
  const broken = mutateSpec(base, testCase.mutate);

  const before = validateAppSpec(broken);
  const beforeCodes = [...new Set(before.errors.map((e) => e.code))];

  const repair = await runRepairEngine({
    jobId: `adversarial-${testCase.id}`,
    prompt: "adversarial validation",
    intent,
    dataSchema: schema,
    draftSpec: broken,
    validationErrors: before.errors,
    existingLog: null,
    repairAttempt: 1,
    sourceStageId: "appSpecGeneration",
  });

  const after = validateAppSpec(repair.appSpec ?? broken);
  const afterCodes = [...new Set(after.errors.map((e) => e.code))];

  const expectsMet = testCase.expectCodesBefore.every((code) => beforeCodes.includes(code));
  const repaired = repair.repairLog.success && after.valid;
  const hasLogs = repair.repairLog.entries.length > 0;

  return {
    id: testCase.id,
    passed: expectsMet && repaired && hasLogs,
    codesBefore: beforeCodes,
    codesAfter: afterCodes,
    repairSuccess: repair.repairLog.success,
    repairEntries: repair.repairLog.entries.length,
  };
}

async function main(): Promise<void> {
  const cases: AdversarialCase[] = [
    {
      id: "camelcase-table-name",
      mutate: (spec) => {
        spec.dataSchema.entities[0]!.tableName = "BadTableName";
      },
      expectCodesBefore: ["invalid_table_name"],
    },
    {
      id: "missing-tenant-id",
      mutate: (spec) => {
        for (const entity of spec.dataSchema.entities) {
          entity.fields = entity.fields.filter((f) => f.name !== "tenant_id");
        }
      },
      expectCodesBefore: ["missing_tenant_id"],
    },
    {
      id: "page-without-endpoint",
      mutate: (spec) => {
        spec.apiEndpoints = [];
      },
      expectCodesBefore: ["page_without_endpoint"],
    },
  ];

  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  const failed = results.filter((r) => !r.passed);
  for (const result of results) {
    console.log(
      JSON.stringify({
        id: result.id,
        passed: result.passed,
        codesBefore: result.codesBefore,
        codesAfter: result.codesAfter,
        repairSuccess: result.repairSuccess,
        repairEntries: result.repairEntries,
      }),
    );
  }

  if (failed.length > 0) {
    console.error(`Adversarial validation failed: ${failed.map((f) => f.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`Adversarial validation passed: ${results.length}/${results.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
