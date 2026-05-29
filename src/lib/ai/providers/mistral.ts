import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callMistralSDK } from "@/lib/ai/providers/mistral-sdk";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "MISTRAL_API_KEY",
  defaultModelEnv: "MISTRAL_DEFAULT_MODEL",
  fallbackModel: "mistral-small-latest",
};

class MistralAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: true,
    cheap: true,
    reasoning: false,
    maxTokens: 32_768,
    supportsStreaming: true,
  };

  constructor() {
    super("mistral", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callMistralSDK(
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("mistral"),
      ),
    );
  }
}

export const mistralAdapter = new MistralAdapter();
