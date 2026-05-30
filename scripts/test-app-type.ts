import { buildMockIntent } from "@/lib/pipeline/mocks/intent-mock";
import { detectAppTypeFromPrompt } from "@/lib/pipeline/intent/app-type-detection";

const cases: { prompt: string; expected: string }[] = [
  { prompt: "Task manager for an engineering team", expected: "project_management" },
  { prompt: "Build a CRM for real estate", expected: "crm" },
  { prompt: "Inventory system for a warehouse", expected: "inventory" },
  { prompt: "HR tool for a 50-person company", expected: "hr_tool" },
  { prompt: "E-commerce backend with Stripe", expected: "ecommerce" },
];

for (const { prompt, expected } of cases) {
  const detected = detectAppTypeFromPrompt(prompt);
  const mock = buildMockIntent(prompt);
  if (detected !== expected || mock.appType !== expected) {
    console.error(
      `FAIL: "${prompt}" → detect=${detected} mock=${mock.appType} (expected ${expected})`,
    );
    process.exit(1);
  }
  console.log(`PASS: "${prompt.slice(0, 42)}…" → ${expected}`);
}

console.log("All appType tests passed.");
