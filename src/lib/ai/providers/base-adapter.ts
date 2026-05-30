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
import { getApiKeyValue } from "@/config/env";
import { executionModeFromMock } from "@/lib/ai/provider-execution";
import { logger } from "@/lib/logging";
import type { SDKCallResult } from "@/lib/ai/providers/sdk-types";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

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
    return getApiKeyValue(this.envConfig.apiKeyEnv) !== undefined;
  }

  protected getApiKey(): string {
    return getApiKeyValue(this.envConfig.apiKeyEnv) ?? "";
  }

  protected resolveModel(input: AIGenerateInput): string {
    const fromEnv = process.env[this.envConfig.defaultModelEnv];
    if (input.model && input.model.length > 0) return input.model;
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    return this.envConfig.fallbackModel;
  }

  private logInvocation(model: string, configured: boolean, input: AIGenerateInput): void {
    logger.debug("Provider selected", {
      provider: this.id,
      model,
      mode: configured ? "real" : "mock",
      ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
    });
  }

  private buildExecutionMeta(
    model: string,
    mock: boolean,
    latencyMs: number,
    sdkFailed: boolean,
    fallbackReason?: string,
  ): ProviderExecutionMeta {
    const mode = executionModeFromMock(mock, sdkFailed);
    return {
      provider: this.id,
      model,
      mode,
      latencyMs,
      ...(fallbackReason !== undefined ? { fallbackReason } : {}),
    };
  }

  private logResponse(model: string, response: AIGatewayResponse<string>): void {
    const mode = response.execution?.mode ?? (response.mock ? "mock" : "live");
    logger.info("Provider completed", {
      provider: this.id,
      model,
      mode,
      ...(response.metadata?.stageId !== undefined
        ? { stageId: response.metadata.stageId }
        : {}),
      latencyMs: response.latencyMs,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      estimatedCostUsd: response.estimatedCostUsd,
    });
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
    const configured = this.isConfigured();

    this.logInvocation(model, configured, input);

    if (!configured) {
      const latencyMs = Date.now() - start;
      const usage = estimateMockUsage(input.prompt);
      const execution = this.buildExecutionMeta(
        model,
        true,
        latencyMs,
        false,
        "API key not configured",
      );
      const response: AIGatewayResponse<string> = {
        data: this.buildMockText(input),
        provider: this.id,
        model,
        usage,
        estimatedCostUsd: estimateCostUsd(this.id, model, usage),
        latencyMs,
        mock: true,
        execution,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      };
      this.logResponse(model, response);
      return response;
    }

    try {
      const result = await this.invokeSDK(input, model);
      const response = this.buildResponse(input, model, result, start, false);
      this.logResponse(model, response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown";
      logger.warn("SDK call failed — falling back to deterministic mock", {
        provider: this.id,
        model,
        error: errorMessage,
      });
      const latencyMs = Date.now() - start;
      const usage = estimateMockUsage(input.prompt);
      const execution = this.buildExecutionMeta(
        model,
        true,
        latencyMs,
        true,
        `SDK call failed: ${errorMessage}`,
      );
      const response: AIGatewayResponse<string> = {
        data: this.buildMockText(input),
        provider: this.id,
        model,
        usage,
        estimatedCostUsd: estimateCostUsd(this.id, model, usage),
        latencyMs,
        mock: true,
        execution,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      };
      this.logResponse(model, response);
      return response;
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
    const latencyMs = Date.now() - startMs;
    const execution = this.buildExecutionMeta(model, mock, latencyMs, false);
    return {
      data: result.text,
      provider: this.id,
      model,
      usage: result.usage,
      estimatedCostUsd: estimateCostUsd(this.id, model, result.usage),
      latencyMs,
      mock,
      execution,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };
  }
}
