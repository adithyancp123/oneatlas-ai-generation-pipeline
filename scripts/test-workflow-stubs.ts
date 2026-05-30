import { buildMockIntent } from "@/lib/pipeline/mocks/intent-mock";
import { buildMockDataSchema } from "@/lib/pipeline/mocks/schema-mock";
import { buildMockAppSpec } from "@/lib/pipeline/mocks/appspec-mock";
import { ensureWorkflowStubs } from "@/lib/pipeline/appspec/workflow-fallback";

function assertWorkflowEntity(prompt: string, expectedEntity: string, expectedEvent: string) {
  const intent = buildMockIntent(prompt);
  const schema = buildMockDataSchema(intent);
  let spec = buildMockAppSpec(intent, schema, prompt);
  spec = { ...spec, workflows: [] };
  spec = ensureWorkflowStubs(spec, prompt);

  const wf = spec.workflows[0];
  if (!wf) {
    console.error(`FAIL [${prompt}]: no workflow stub`);
    process.exit(1);
  }

  const entity = wf.triggerMeta?.entity;
  const event = wf.triggerMeta?.event;
  if (entity !== expectedEntity || event !== expectedEvent) {
    console.error(
      `FAIL [${prompt}]: expected entity=${expectedEntity} event=${expectedEvent}, got entity=${entity} event=${event}`,
    );
    console.error("schema entities:", schema.entities.map((e) => e.name));
    process.exit(1);
  }

  console.log(`PASS [${prompt.slice(0, 40)}…]: entity=${entity}, event=${event}`);
}

assertWorkflowEntity("Task manager with Slack", "Task", "status_changed");
assertWorkflowEntity(
  "CRM with WhatsApp when deal closes",
  "Deal",
  "status_changed",
);

console.log("All workflow stub entity tests passed.");
