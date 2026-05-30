import type { ProviderCapabilities, ProviderId } from "@/lib/ai/gateway/types";

export interface ProviderDefinition {
  id: ProviderId;
  displayName: string;
  /** Primary env var(s) for API key */
  apiKeyEnvKeys: readonly string[];
  defaultModelEnv: string;
  /** Default model when env override is unset (adapter fallback) */
  defaultModel: string;
  capabilities: ProviderCapabilities;
}

/** Static registry — all 8 assignment API key slots map to these 8 gateway adapters. */
export const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  {
    id: "openai",
    displayName: "OpenAI",
    apiKeyEnvKeys: ["OPENAI_API_KEY"],
    defaultModelEnv: "OPENAI_DEFAULT_MODEL",
    defaultModel: "gpt-4o-mini",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: false,
      reasoning: true,
      maxTokens: 128_000,
      supportsStreaming: true,
    },
  },
  {
    id: "anthropic",
    displayName: "Anthropic",
    apiKeyEnvKeys: ["ANTHROPIC_API_KEY"],
    defaultModelEnv: "ANTHROPIC_DEFAULT_MODEL",
    defaultModel: "claude-3-5-haiku-latest",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: false,
      reasoning: true,
      maxTokens: 200_000,
      supportsStreaming: true,
    },
  },
  {
    id: "groq",
    displayName: "Groq",
    apiKeyEnvKeys: ["GROQ_API_KEY"],
    defaultModelEnv: "GROQ_DEFAULT_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: false,
      maxTokens: 32_768,
      supportsStreaming: true,
    },
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    apiKeyEnvKeys: ["GEMINI_API_KEY"],
    defaultModelEnv: "GEMINI_DEFAULT_MODEL",
    defaultModel: "gemini-1.5-flash",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: false,
      maxTokens: 1_000_000,
      supportsStreaming: true,
    },
  },
  {
    id: "google-ai",
    displayName: "Google AI",
    apiKeyEnvKeys: ["GOOGLE_AI_API_KEY"],
    defaultModelEnv: "GOOGLE_AI_DEFAULT_MODEL",
    defaultModel: "gemini-1.5-flash",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: false,
      maxTokens: 1_000_000,
      supportsStreaming: true,
    },
  },
  {
    id: "deepseek",
    displayName: "DeepSeek",
    apiKeyEnvKeys: ["DEEPSEEK_API_KEY"],
    defaultModelEnv: "DEEPSEEK_DEFAULT_MODEL",
    defaultModel: "deepseek-chat",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: true,
      maxTokens: 64_000,
      supportsStreaming: true,
    },
  },
  {
    id: "openrouter",
    displayName: "OpenRouter",
    apiKeyEnvKeys: ["OPENROUTER_API_KEY"],
    defaultModelEnv: "OPENROUTER_DEFAULT_MODEL",
    defaultModel: "openai/gpt-4o-mini",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: false,
      maxTokens: 128_000,
      supportsStreaming: true,
    },
  },
  {
    id: "mistral",
    displayName: "Mistral",
    apiKeyEnvKeys: ["MISTRAL_API_KEY"],
    defaultModelEnv: "MISTRAL_DEFAULT_MODEL",
    defaultModel: "mistral-small-latest",
    capabilities: {
      structuredOutput: true,
      supportsJson: true,
      fast: true,
      cheap: true,
      reasoning: false,
      maxTokens: 32_000,
      supportsStreaming: true,
    },
  },
] as const;

export const ASSIGNMENT_API_KEY_ENV_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "MISTRAL_API_KEY",
] as const;

export function getProviderDefinition(id: ProviderId): ProviderDefinition | undefined {
  return PROVIDER_DEFINITIONS.find((entry) => entry.id === id);
}
