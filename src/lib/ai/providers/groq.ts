import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callOpenAICompatible } from "@/lib/ai/providers/openai-compatible";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "GROQ_API_KEY",
  defaultModelEnv: "GROQ_DEFAULT_MODEL",
  fallbackModel: "llama-3.3-70b-versatile",
};

class GroqAdapter extends BaseProviderAdapter {
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
    super("groq", envConfig);
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callOpenAICompatible(
      "groq",
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("groq"),
        "https://api.groq.com/openai/v1",
      ),
    );
  }
}

export const groqAdapter = new GroqAdapter();
