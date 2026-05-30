import { getEnv } from "@/config/env";
import { getStageRouting } from "@/config/routing";
import { getOpenRouterAdapter, getProviderAdapter, resolveProviderId } from "@/lib/ai/gateway/provider-factory";
import type {
  AIGatewayResponse,
  AIGenerateInput,
  AIGenerateStructuredInput,
  ProviderId,
} from "@/lib/ai/gateway/types";
import { isRetryableProviderError, ProviderRequestError } from "@/lib/ai/gateway/types";
import { applyRoutingExecution } from "@/lib/ai/provider-execution";
import { resolveFallbackRoute, resolveRoute } from "@/lib/ai/routing/resolver";
import {
  buildStructuredSystemPrompt,
  parseStructuredJson,
} from "@/lib/ai/structured/parse-structured";
import { extractJsonPayload } from "@/lib/ai/structured/json-utils";
import { logger } from "@/lib/logging";
import type { PipelineStageId } from "@/types/pipeline";
import type { z } from "zod";

const OPENROUTER_UNIVERSAL_FALLBACK: ProviderId = "openrouter";
const LOG_RAW_PREVIEW_CHARS = 800;

interface StageGenerateOptions {
  stageId: PipelineStageId;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, string>;
}

export class AIGateway {
  async generateText(input: AIGenerateInput): Promise<AIGatewayResponse<string>> {
    return this.executeWithRouting(input);
  }

  async generateStructured<T>(
    input: AIGenerateStructuredInput<T>,
  ): Promise<AIGatewayResponse<T>> {
    const structuredInput: AIGenerateStructuredInput<T> = {
      ...input,
      prompt: `${buildStructuredSystemPrompt(input.stageId ?? "output")}\n\n${input.prompt}`,
    };

    const textResult = await this.executeWithRouting(structuredInput);
    if (textResult.mock) {
      return textResult as AIGatewayResponse<T>;
    }

    const raw = textResult.data;
    const extracted = extractJsonPayload(raw);
    const parseResult = parseStructuredJson(raw, input.schema);

    if (parseResult.success && parseResult.data !== undefined) {
      logger.debug("Structured output parsed", {
        ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
        provider: textResult.provider,
        model: textResult.model,
        rawLength: raw.length,
        extractedLength: extracted.length,
        usedExtraction: extracted !== raw.trim(),
      });
      return { ...textResult, data: parseResult.data };
    }

    const cause = parseResult.error ?? "Unable to parse JSON";
    logger.warn("Structured output parse failed", {
      ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
      provider: textResult.provider,
      model: textResult.model,
      parseError: cause,
      rawPreview: raw.slice(0, LOG_RAW_PREVIEW_CHARS),
      extractedPreview: extracted.slice(0, LOG_RAW_PREVIEW_CHARS),
      ...(input.metadata?.jobId !== undefined ? { jobId: input.metadata.jobId } : {}),
    });

    throw new ProviderRequestError(
      `Structured output parse failed: ${cause}`,
      textResult.provider,
      undefined,
      false,
      new Error(cause),
    );
  }

  async generateForStage<T>(
    options: StageGenerateOptions,
    schema: z.ZodType<T>,
  ): Promise<AIGatewayResponse<T>> {
    const route = resolveRoute(options.stageId);
    const input: AIGenerateStructuredInput<T> = {
      provider: resolveProviderId(route.provider),
      model: route.model,
      prompt: options.prompt,
      schema,
      stageId: options.stageId,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 4096,
      ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    };

    return this.generateStructured(input);
  }

  private async executeWithRouting(
    input: AIGenerateInput,
  ): Promise<AIGatewayResponse<string>> {
    const stageId = input.stageId;
    if (!stageId) {
      return this.invokeProvider(input.provider, input);
    }

    const primaryRoute = resolveRoute(stageId);
    const fallbackRoute = resolveFallbackRoute(stageId);

    logger.debug("Stage routing", {
      stageId,
      primary: primaryRoute.provider,
      primaryModel: primaryRoute.model || "(adapter default)",
      fallback: fallbackRoute.provider,
      fallbackModel: fallbackRoute.model || "(adapter default)",
    });

    const attempts: Array<{ provider: ProviderId; model: string }> = [
      { provider: resolveProviderId(primaryRoute.provider), model: primaryRoute.model },
      { provider: resolveProviderId(fallbackRoute.provider), model: fallbackRoute.model },
    ];

    const openRouter = getOpenRouterAdapter();
    if (openRouter.isConfigured()) {
      const orModel =
        getEnv().OPENROUTER_DEFAULT_MODEL ?? process.env.OPENROUTER_DEFAULT_MODEL ?? "openrouter/auto";
      attempts.push({ provider: OPENROUTER_UNIVERSAL_FALLBACK, model: orModel });
    }

    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
      const attempt = attempts[attemptIndex]!;
      try {
        const response = await this.invokeProvider(attempt.provider, {
          ...input,
          provider: attempt.provider,
          model: attempt.model || input.model,
        });

        const routing = getStageRouting(stageId);
        if (
          routing &&
          !response.mock &&
          response.estimatedCostUsd > routing.costThresholdUsd
        ) {
          logger.warn("Cost threshold exceeded, trying next provider", {
            stageId,
            cost: response.estimatedCostUsd,
            threshold: routing.costThresholdUsd,
          });
          continue;
        }

        if (
          routing &&
          !response.mock &&
          response.latencyMs > routing.latencyThresholdMs
        ) {
          logger.warn("Latency threshold exceeded, trying next provider", {
            stageId,
            latencyMs: response.latencyMs,
            threshold: routing.latencyThresholdMs,
          });
          continue;
        }

        const execution = applyRoutingExecution(
          response,
          attemptIndex,
          primaryRoute.provider,
        );
        return { ...response, execution };
      } catch (error) {
        lastError = error;
        if (!isRetryableProviderError(error)) {
          logger.error("Non-retryable provider error", {
            stageId,
            provider: attempt.provider,
            error: error instanceof Error ? error.message : "unknown",
          });
          continue;
        }
        logger.warn("Retryable provider error, attempting fallback", {
          stageId,
          provider: attempt.provider,
        });
      }
    }

    if (lastError instanceof ProviderRequestError && !lastError.retryable) {
      throw lastError;
    }

    try {
      return await this.invokeProvider(resolveProviderId(primaryRoute.provider), {
      ...input,
      provider: resolveProviderId(primaryRoute.provider),
      model: primaryRoute.model,
      });
    } catch (finalError) {
      if (finalError instanceof ProviderRequestError) throw finalError;
      throw finalError;
    }
  }

  private async invokeProvider(
    providerId: ProviderId,
    input: AIGenerateInput,
  ): Promise<AIGatewayResponse<string>> {
    const adapter = getProviderAdapter(providerId);

    logger.debug("Gateway invoke", {
      ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
      provider: providerId,
      model: input.model || "(adapter default)",
    });

    return adapter.generateText({
      ...input,
      provider: providerId,
    });
  }
}

export const aiGateway = new AIGateway();
