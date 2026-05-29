import type { AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallOptions } from "@/lib/ai/providers/sdk-types";

export function buildSdkCallOptions(
  apiKey: string,
  model: string,
  input: AIGenerateInput,
  systemPrompt?: string,
  baseUrl?: string,
): SDKCallOptions {
  return {
    apiKey,
    model,
    prompt: input.prompt,
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  };
}
