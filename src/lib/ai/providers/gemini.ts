import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callGeminiSDK } from "@/lib/ai/providers/gemini-sdk";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";
import { getGeminiApiKeyValue } from "@/config/env";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "GEMINI_API_KEY",
  defaultModelEnv: "GEMINI_DEFAULT_MODEL",
  fallbackModel: "gemini-1.5-flash",
};

class GeminiAdapter extends BaseProviderAdapter {
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    supportsJson: true,
    fast: true,
    cheap: true,
    reasoning: false,
    maxTokens: 1_000_000,
    supportsStreaming: true,
  };

  constructor() {
    super("gemini", envConfig);
  }

  override isConfigured(): boolean {
    return getGeminiApiKeyValue() !== undefined;
  }

  protected override getApiKey(): string {
    return getGeminiApiKeyValue() ?? "";
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callGeminiSDK(
      buildSdkCallOptions(
        this.getApiKey(),
        model,
        input,
        systemPrompt ?? buildStructuredSystemPrompt("gemini"),
      ),
    );
  }
}

export const geminiAdapter = new GeminiAdapter();
