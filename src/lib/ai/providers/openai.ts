import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callOpenAICompatible } from "@/lib/ai/providers/openai-compatible";
import type { ProviderCapabilities } from "@/lib/ai/gateway/types";
import type { AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "OPENAI_API_KEY",
  defaultModelEnv: "OPENAI_DEFAULT_MODEL",
  fallbackModel: "gpt-4o-mini",
};

class OpenAIAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: true,
    cheap: false,
    reasoning: true,
    maxTokens: 128_000,
    supportsStreaming: true,
  };

  constructor() {
    super("openai", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callOpenAICompatible(
      "openai",
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("openai"),
      ),
    );
  }
}

export const openaiAdapter = new OpenAIAdapter();
