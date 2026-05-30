import type { z } from "zod";
import type { ProviderExecutionMeta } from "@/types/provider-execution";
import type { PipelineStageId } from "@/types/pipeline";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "groq"
  | "gemini"
  | "google-ai"
  | "deepseek"
  | "mistral"
  | "openrouter";

export interface ProviderCapabilities {
  structuredOutput: boolean;
  supportsJson: boolean;
  fast: boolean;
  cheap: boolean;
  reasoning: boolean;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface AIGenerateInput {
  provider: ProviderId;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stageId?: PipelineStageId;
  metadata?: Record<string, string>;
}

export interface AIGenerateStructuredInput<T> extends AIGenerateInput {
  schema: z.ZodType<T>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIGatewayResponse<T = string> {
  data: T;
  provider: ProviderId;
  model: string;
  usage: TokenUsage;
  estimatedCostUsd: number;
  latencyMs: number;
  mock: boolean;
  /** Reviewer-facing execution mode (live API vs mock / SDK fallback). */
  execution?: ProviderExecutionMeta;
  metadata?: Record<string, string>;
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  isConfigured(): boolean;
  generateText(input: AIGenerateInput): Promise<AIGatewayResponse<string>>;
  generateStructured<T>(input: AIGenerateStructuredInput<T>): Promise<AIGatewayResponse<T>>;
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderId,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof ProviderRequestError) {
    return error.retryable;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return false;
}
