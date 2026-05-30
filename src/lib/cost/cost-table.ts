/** Per-token pricing in USD (per 1M tokens) */
export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const COST_TABLE: Record<string, ModelPricing> = {
  "openai:default": { inputPer1M: 2.5, outputPer1M: 10 },
  "anthropic:default": { inputPer1M: 3, outputPer1M: 15 },
  "groq:default": { inputPer1M: 0.5, outputPer1M: 1 },
  "gemini:default": { inputPer1M: 1.25, outputPer1M: 5 },
  "google-ai:default": { inputPer1M: 1.25, outputPer1M: 5 },
  "deepseek:default": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "mistral:default": { inputPer1M: 2, outputPer1M: 6 },
  "openrouter:default": { inputPer1M: 2, outputPer1M: 8 },
};

export const DEFAULT_PRICING: ModelPricing = { inputPer1M: 2, outputPer1M: 8 };

export function getPricingKey(provider: string, model: string): string {
  const specific = `${provider}:${model}`;
  if (COST_TABLE[specific]) return specific;
  return `${provider}:default`;
}
