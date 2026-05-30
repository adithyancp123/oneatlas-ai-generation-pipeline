import { buildMockIntent } from "@/lib/pipeline/mocks/intent-mock";
import { buildMockDataSchema } from "@/lib/pipeline/mocks/schema-mock";
import { buildMockAppSpec } from "@/lib/pipeline/mocks/appspec-mock";
import {
  buildAppSpecGenerationPrompt,
  ensureWorkflowStubs,
} from "@/lib/pipeline/appspec/workflow-fallback";

const prompt =
  "Build a CRM for a real estate agency. WhatsApp notifications when a deal closes.";

const intent = buildMockIntent(prompt);
const schema = buildMockDataSchema(intent);

console.log("integrationsRequested:", intent.integrationsRequested);

const promptText = buildAppSpecGenerationPrompt(prompt, intent, schema);
const hasIntegrationInPrompt = promptText.includes("integrationsRequested");
const hasWorkflowInstruction = /at least one workflow stub/i.test(promptText);
console.log("prompt includes integrationsRequested:", hasIntegrationInPrompt);
console.log("prompt requires workflow per integration:", hasWorkflowInstruction);

let spec = buildMockAppSpec(intent, schema, prompt);
console.log("mock workflows (before clear):", spec.workflows.length);

spec = { ...spec, workflows: [] };
spec = ensureWorkflowStubs(spec, prompt);

console.log("fallback workflows:", spec.workflows.length);
if (spec.workflows.length < 1) {
  console.error("FAIL: expected >= 1 workflow stub");
  process.exit(1);
}

const wf = spec.workflows[0]!;
console.log("triggerMeta:", wf.triggerMeta);
console.log("stepMeta:", wf.stepMeta?.[0]);

const ok =
  intent.integrationsRequested.includes("whatsapp-twilio") &&
  wf.triggerMeta?.entity === "Deal" &&
  wf.triggerMeta?.event === "status_changed" &&
  wf.stepMeta?.[0]?.payloadMapping?.condition === "status === 'closed'";

if (!ok) {
  console.error("FAIL: workflow stub shape mismatch");
  process.exit(1);
}

console.log("PASS: workflow stubs generated for WhatsApp deal-close prompt");
