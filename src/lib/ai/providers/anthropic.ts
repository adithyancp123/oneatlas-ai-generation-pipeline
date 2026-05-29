import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callAnthropicSDK } from "@/lib/ai/providers/anthropic-sdk";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "ANTHROPIC_API_KEY",
  defaultModelEnv: "ANTHROPIC_DEFAULT_MODEL",
  fallbackModel: "claude-3-5-haiku-latest",
};

class AnthropicAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: false,
    cheap: false,
    reasoning: true,
    maxTokens: 200_000,
    supportsStreaming: true,
  };

  constructor() {
    super("anthropic", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callAnthropicSDK(
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("anthropic"),
      ),
    );
  }
}

export const anthropicAdapter = new AnthropicAdapter();
