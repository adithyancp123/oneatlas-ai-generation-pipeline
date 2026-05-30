/**
 * Manual cross-layer validation smoke test.
 * Run: npm run test:cross-layer
 */
import { buildMockAppSpec } from "@/lib/pipeline/mocks/appspec-mock";
import { buildMockIntent } from "@/lib/pipeline/mocks/intent-mock";
import { buildMockDataSchema } from "@/lib/pipeline/mocks/schema-mock";
import { validateAppSpec } from "@/lib/pipeline/validators/validation-engine";
import type { AppSpec } from "@/types/domain";

function logErrors(label: string, result: ReturnType<typeof validateAppSpec>): void {
  console.log(`\n--- ${label} ---`);
  console.log(`valid: ${result.valid}`);
  for (const error of result.errors) {
    console.log(
      JSON.stringify({
        field: error.field,
        message: error.message,
        code: error.code,
      }),
    );
  }
}

function mutate(base: AppSpec, fn: (spec: AppSpec) => void): AppSpec {
  const copy = structuredClone(base);
  fn(copy);
  return copy;
}

const intent = buildMockIntent("CRM with contacts and Slack");
const dataSchema = buildMockDataSchema(intent);
const validSpec = buildMockAppSpec(intent, dataSchema);

logErrors("Valid baseline AppSpec", validateAppSpec(validSpec, { canonicalDataSchema: dataSchema }));

const pageWithoutEndpoint = mutate(validSpec, (spec) => {
  spec.pages.push({
    id: "page-orphan",
    name: "Orphan",
    route: "/orphan",
    description: "No API coverage",
    entities: ["Contact"],
  });
  spec.apiEndpoints = spec.apiEndpoints.filter((ep) => ep.boundEntity !== "Contact");
});

logErrors(
  "Broken: page with no matching endpoint for Contact",
  validateAppSpec(pageWithoutEndpoint, { canonicalDataSchema: dataSchema }),
);

const fakeWorkflowEntity = mutate(validSpec, (spec) => {
  spec.workflows = [
    {
      id: "wf-bad-entity",
      name: "Bad entity workflow",
      steps: ["slack:message.send"],
      trigger: "message.posted",
      triggerMeta: { entity: "NotARealEntity" },
    },
  ];
});

logErrors(
  "Broken: workflow triggerMeta.entity not in DataSchema",
  validateAppSpec(fakeWorkflowEntity, { canonicalDataSchema: dataSchema }),
);

const fakeIntegration = mutate(validSpec, (spec) => {
  spec.integrations.push({
    integrationId: "telegram",
    trigger: "message.posted",
    action: "message.send",
    config: {},
  });
});

logErrors(
  "Broken: integration hook not in registry",
  validateAppSpec(fakeIntegration, { canonicalDataSchema: dataSchema }),
);

const unknownAuthRole = mutate(validSpec, (spec) => {
  spec.auth.permissions = [
    { entity: spec.dataSchema.entities[0]!.name, role: "superadmin", actions: ["read"] },
  ];
});

logErrors(
  "Broken: auth permission references undefined role",
  validateAppSpec(unknownAuthRole, { canonicalDataSchema: dataSchema }),
);

const expectedCodes = new Set([
  "page_without_endpoint",
  "workflow_invalid_entity",
  "integration_not_in_registry",
  "auth_permission_unknown_role",
]);

const cases = [
  { name: "page", result: validateAppSpec(pageWithoutEndpoint, { canonicalDataSchema: dataSchema }) },
  { name: "workflow", result: validateAppSpec(fakeWorkflowEntity, { canonicalDataSchema: dataSchema }) },
  { name: "integration", result: validateAppSpec(fakeIntegration, { canonicalDataSchema: dataSchema }) },
  { name: "auth", result: validateAppSpec(unknownAuthRole, { canonicalDataSchema: dataSchema }) },
];

let passed = 0;
for (const testCase of cases) {
  const codes = new Set(testCase.result.errors.map((e) => e.code));
  const ok = !testCase.result.valid && [...expectedCodes].some((c) => codes.has(c));
  if (ok) passed += 1;
  console.log(`\n[${ok ? "PASS" : "FAIL"}] ${testCase.name} caught errors: ${[...codes].join(", ")}`);
}

console.log(`\nCross-layer validation smoke: ${passed}/${cases.length} cases detected expected failures`);
process.exit(passed === cases.length ? 0 : 1);
