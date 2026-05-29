import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callOpenAICompatible } from "@/lib/ai/providers/openai-compatible";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "DEEPSEEK_API_KEY",
  defaultModelEnv: "DEEPSEEK_DEFAULT_MODEL",
  fallbackModel: "deepseek-chat",
};

class DeepSeekAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: false,
    cheap: true,
    reasoning: true,
    maxTokens: 64_000,
    supportsStreaming: false,
  };

  constructor() {
    super("deepseek", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callOpenAICompatible(
      "deepseek",
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("deepseek"),
        "https://api.deepseek.com",
      ),
    );
  }
}

export const deepseekAdapter = new DeepSeekAdapter();
