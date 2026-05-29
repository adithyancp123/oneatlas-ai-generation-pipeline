import { estimateCostUsd } from "@/lib/cost";
import {
  buildJsonCorrectionPrompt,
  buildStructuredSystemPrompt,
  parseStructuredJson,
} from "@/lib/ai/structured/parse-structured";
import type {
  AIGatewayResponse,
  AIGenerateInput,
  AIGenerateStructuredInput,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderId,
  TokenUsage,
} from "@/lib/ai/gateway/types";
import { ProviderRequestError } from "@/lib/ai/gateway/types";
import { logger } from "@/lib/logging";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";

export interface ProviderEnvConfig {
  apiKeyEnv: string;
  defaultModelEnv: string;
  fallbackModel: string;
}

function estimateMockUsage(prompt: string): TokenUsage {
  const promptTokens = Math.max(50, Math.ceil(prompt.length / 4));
  const completionTokens = Math.min(800, promptTokens * 2);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly capabilities: ProviderCapabilities;

  constructor(
    public readonly id: ProviderId,
    private readonly envConfig: ProviderEnvConfig,
  ) {}

  isConfigured(): boolean {
    const key = process.env[this.envConfig.apiKeyEnv];
    return Boolean(key && key.length > 0);
  }

  protected getApiKey(): string {
    return process.env[this.envConfig.apiKeyEnv] ?? "";
  }

  protected resolveModel(input: AIGenerateInput): string {
    const fromEnv = process.env[this.envConfig.defaultModelEnv];
    if (input.model && input.model.length > 0) return input.model;
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    return this.envConfig.fallbackModel;
  }

  protected abstract invokeSDK(
    input: AIGenerateInput,
    model: string,
    systemPrompt?: string,
  ): Promise<SDKCallResult>;

  protected buildMockText(input: AIGenerateInput): string {
    return JSON.stringify({
      mock: true,
      provider: this.id,
      stageId: input.stageId ?? "unknown",
      note: "Deterministic mock — configure API key for live generation",
    });
  }

  async generateText(input: AIGenerateInput): Promise<AIGatewayResponse<string>> {
    const start = Date.now();
    const model = this.resolveModel(input);

    if (!this.isConfigured()) {
      const usage = estimateMockUsage(input.prompt);
      return {
        data: this.buildMockText(input),
        provider: this.id,
        model,
        usage,
        estimatedCostUsd: estimateCostUsd(this.id, model, usage),
        latencyMs: Date.now() - start,
        mock: true,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      };
    }

    try {
      const result = await this.invokeSDK(input, model);
      return this.buildResponse(input, model, result, start, false);
    } catch (error) {
      logger.warn("SDK call failed — falling back to deterministic mock", {
        provider: this.id,
        error: error instanceof Error ? error.message : "unknown",
      });
      const usage = estimateMockUsage(input.prompt);
      return {
        data: this.buildMockText(input),
        provider: this.id,
        model,
        usage,
        estimatedCostUsd: estimateCostUsd(this.id, model, usage),
        latencyMs: Date.now() - start,
        mock: true,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      };
    }
  }

  async generateStructured<T>(
    input: AIGenerateStructuredInput<T>,
  ): Promise<AIGatewayResponse<T>> {
    const textResponse = await this.generateText({
      ...input,
      prompt: `${buildStructuredSystemPrompt(input.stageId ?? "output")}\n\n${input.prompt}`,
    });

    if (textResponse.mock) {
      return { ...textResponse, data: textResponse.data as T };
    }

    const firstParse = parseStructuredJson(textResponse.data, input.schema);
    if (firstParse.success && firstParse.data !== undefined) {
      return { ...textResponse, data: firstParse.data };
    }

    if (!this.isConfigured()) {
      throw new ProviderRequestError("Structured parse failed in mock mode", this.id);
    }

    const correctionPrompt = buildJsonCorrectionPrompt(
      textResponse.data,
      firstParse.error ?? "Invalid JSON",
    );

    const retryStart = Date.now();
    const retryResult = await this.invokeSDK(
      { ...input, prompt: correctionPrompt },
      textResponse.model,
      buildStructuredSystemPrompt("correction"),
    );

    const retryResponse = this.buildResponse(
      input,
      textResponse.model,
      retryResult,
      retryStart,
      false,
    );

    const secondParse = parseStructuredJson(retryResponse.data, input.schema);
    if (secondParse.success && secondParse.data !== undefined) {
      return {
        ...retryResponse,
        data: secondParse.data,
        latencyMs: textResponse.latencyMs + retryResponse.latencyMs,
        usage: {
          promptTokens: textResponse.usage.promptTokens + retryResponse.usage.promptTokens,
          completionTokens:
            textResponse.usage.completionTokens + retryResponse.usage.completionTokens,
          totalTokens: textResponse.usage.totalTokens + retryResponse.usage.totalTokens,
        },
        estimatedCostUsd: textResponse.estimatedCostUsd + retryResponse.estimatedCostUsd,
      };
    }

    throw new ProviderRequestError(
      secondParse.error ?? "Structured output parse failed after retry",
      this.id,
      undefined,
      false,
    );
  }

  private buildResponse(
    input: AIGenerateInput,
    model: string,
    result: SDKCallResult,
    startMs: number,
    mock: boolean,
  ): AIGatewayResponse<string> {
    return {
      data: result.text,
      provider: this.id,
      model,
      usage: result.usage,
      estimatedCostUsd: estimateCostUsd(this.id, model, result.usage),
      latencyMs: Date.now() - startMs,
      mock,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };
  }
}
