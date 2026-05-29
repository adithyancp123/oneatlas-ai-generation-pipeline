import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callOpenAICompatible } from "@/lib/ai/providers/openai-compatible";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "OPENROUTER_API_KEY",
  defaultModelEnv: "OPENROUTER_DEFAULT_MODEL",
  fallbackModel: "openai/gpt-4o-mini",
};

class OpenRouterAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: true,
    cheap: true,
    reasoning: false,
    maxTokens: 128_000,
    supportsStreaming: false,
  };

  constructor() {
    super("openrouter", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callOpenAICompatible(
      "openrouter",
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("openrouter"),
        "https://openrouter.ai/api/v1",
      ),
    );
  }
}

export const openrouterAdapter = new OpenRouterAdapter();
