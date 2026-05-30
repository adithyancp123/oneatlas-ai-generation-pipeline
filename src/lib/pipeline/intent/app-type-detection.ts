import type { AppIntent } from "@/types/domain";

/** Valid appType values for intent extraction (Zod + domain). */
export const APP_TYPE_VALUES = [
  "crm",
  "project_management",
  "ecommerce",
  "hr_tool",
  "inventory",
  "content_platform",
  "analytics",
  "custom",
] as const;

export type AppType = (typeof APP_TYPE_VALUES)[number];

const APP_TYPE_KEYWORD_RULES: { type: AppType; pattern: RegExp }[] = [
  {
    type: "project_management",
    pattern: /\b(task|tasks|task manager|project|milestone|sprint)\b/i,
  },
  {
    type: "crm",
    pattern: /\b(crm|lead|deal|sales|real estate agent|real estate)\b/i,
  },
  {
    type: "ecommerce",
    pattern: /\b(shop|ecommerce|e-commerce|product|order|cart|payment|stripe)\b/i,
  },
  {
    type: "hr_tool",
    pattern: /\b(hr|employee|leave|payroll|performance review)\b/i,
  },
  {
    type: "inventory",
    pattern: /\b(inventory|warehouse|stock|supplier)\b/i,
  },
  {
    type: "content_platform",
    pattern: /\b(blog|content|article|cms|publish)\b/i,
  },
  {
    type: "analytics",
    pattern: /\b(analytics|dashboard|report|metrics)\b/i,
  },
];

const APP_TYPE_ENUM_SET = new Set<string>(APP_TYPE_VALUES);

/**
 * Keyword-based appType detection from the user prompt (deterministic).
 * First matching rule wins; otherwise `custom`.
 */
export function detectAppTypeFromPrompt(prompt: string): AppType {
  for (const rule of APP_TYPE_KEYWORD_RULES) {
    if (rule.pattern.test(prompt)) {
      return rule.type;
    }
  }
  return "custom";
}

export function isValidAppType(value: unknown): value is AppType {
  return typeof value === "string" && APP_TYPE_ENUM_SET.has(value);
}

/** Prompt sent to the LLM for live intent extraction. */
export function buildIntentExtractionPrompt(userPrompt: string): string {
  return [
    userPrompt,
    "",
    "Extract application intent as structured JSON.",
    `appType must be one of: ${APP_TYPE_VALUES.join(" | ")}. Choose the closest match to the user request.`,
  ].join("\n");
}

/**
 * If the model returns an appType outside the enum, override via keyword detection.
 */
export function correctIntentAppType(prompt: string, intent: AppIntent): AppIntent {
  if (isValidAppType(intent.appType)) {
    return intent;
  }

  const detected = detectAppTypeFromPrompt(prompt);
  return {
    ...intent,
    appType: detected,
    assumptions: [
      ...intent.assumptions,
      `appType corrected to "${detected}" using keyword detection (model returned invalid appType)`,
    ],
  };
}
