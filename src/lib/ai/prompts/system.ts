export const SYSTEM_PROMPT_BASE = `You are an expert software architect assistant.
Your role is to help convert natural language application descriptions into structured, validated specifications.
Respond only with valid JSON when asked for structured output.`;

export const STAGE_PROMPT_PLACEHOLDERS = {
  intake: "Analyze the user prompt and extract core intent.",
  decompose: "Break the application into discrete features and modules.",
  enrich: "Add technical detail, constraints, and integration requirements.",
  validate: "Verify the specification meets schema requirements.",
  repair: "Fix validation errors while preserving user intent.",
} as const;
