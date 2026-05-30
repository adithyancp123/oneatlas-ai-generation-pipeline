import { BaseProviderAdapter, type ProviderEnvConfig } from "@/lib/ai/providers/base-adapter";
import { callGeminiSDK } from "@/lib/ai/providers/gemini-sdk";
import type { ProviderCapabilities, AIGenerateInput } from "@/lib/ai/gateway/types";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { buildSdkCallOptions } from "@/lib/ai/providers/sdk-helpers";
import { buildStructuredSystemPrompt } from "@/lib/ai/structured/parse-structured";
import { getApiKeyValue, getEnvValue } from "@/config/env";

const envConfig: ProviderEnvConfig = {
  apiKeyEnv: "GOOGLE_AI_API_KEY",
  defaultModelEnv: "GOOGLE_AI_DEFAULT_MODEL",
  fallbackModel: "gemini-1.5-flash",
};

class GoogleAiAdapter extends BaseProviderAdapter {
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
    super("google-ai", envConfig);
  }

  override isConfigured(): boolean {
    return getApiKeyValue("GOOGLE_AI_API_KEY") !== undefined;
  }

  protected override getApiKey(): string {
    return getApiKeyValue("GOOGLE_AI_API_KEY") ?? "";
  }

  /** Resolved model: input override → GOOGLE_AI_DEFAULT_MODEL → gemini-1.5-flash */
  getModel(inputModel?: string): string {
    if (inputModel && inputModel.length > 0) return inputModel;
    const fromEnv = getEnvValue("GOOGLE_AI_DEFAULT_MODEL");
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    return envConfig.fallbackModel;
  }

  protected invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult> {
    return callGeminiSDK(
      buildSdkCallOptions(
        this.getApiKey(),
        this.getModel(model),
        input,
        systemPrompt ?? buildStructuredSystemPrompt("google-ai"),
      ),
      "google-ai",
    );
  }
}

export const googleAiAdapter = new GoogleAiAdapter();
