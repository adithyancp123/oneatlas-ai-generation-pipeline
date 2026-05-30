import type { PipelineStageId } from "@/types/pipeline";

export type RoutingStrategy = "primary-first" | "fallback-on-error" | "cost-optimized" | "latency-optimized";

export interface ModelRef {
  /** Provider identifier — resolved by the AI gateway at runtime */
  provider: string;
  /** Environment variable key that holds the model name (not a hardcoded model string) */
  modelEnvKey: string;
}

export interface StageRoutingEntry {
  stageId: PipelineStageId;
  primary: ModelRef;
  fallback: ModelRef;
  strategy: RoutingStrategy;
  /** Max estimated cost in USD before switching to fallback */
  costThresholdUsd: number;
  /** Max acceptable latency in ms before switching to fallback */
  latencyThresholdMs: number;
  /** Optional env key for per-stage model override */
  overrideEnvKey?: string;
}

/**
 * Single source of truth for per-stage model routing.
 * Stages must never embed model names — they resolve via this config + env.
 *
 * Primary providers (internship compliance):
 * - intentExtraction → Groq (fast/cheap)
 * - schemaGeneration → Gemini (primary), Google AI (fallback)
 * - appSpecGeneration → OpenAI (quality)
 * - repair → OpenAI with Groq fallback
 */
export const STAGE_ROUTING_CONFIG: readonly StageRoutingEntry[] = [
  {
    stageId: "intentExtraction",
    primary: { provider: "groq", modelEnvKey: "GROQ_DEFAULT_MODEL" },
    fallback: { provider: "openai", modelEnvKey: "OPENAI_DEFAULT_MODEL" },
    strategy: "latency-optimized",
    costThresholdUsd: 0.05,
    latencyThresholdMs: 8_000,
    overrideEnvKey: "INTENT_EXTRACTION_MODEL_OVERRIDE",
  },
  {
    stageId: "schemaGeneration",
    primary: { provider: "gemini", modelEnvKey: "GEMINI_DEFAULT_MODEL" },
    fallback: { provider: "google-ai", modelEnvKey: "GOOGLE_AI_DEFAULT_MODEL" },
    strategy: "cost-optimized",
    costThresholdUsd: 0.1,
    latencyThresholdMs: 15_000,
    overrideEnvKey: "SCHEMA_GENERATION_MODEL_OVERRIDE",
  },
  {
    stageId: "appSpecGeneration",
    primary: { provider: "openai", modelEnvKey: "OPENAI_DEFAULT_MODEL" },
    fallback: { provider: "groq", modelEnvKey: "GROQ_DEFAULT_MODEL" },
    strategy: "primary-first",
    costThresholdUsd: 0.2,
    latencyThresholdMs: 20_000,
    overrideEnvKey: "APP_SPEC_GENERATION_MODEL_OVERRIDE",
  },
  {
    stageId: "repair",
    primary: { provider: "openai", modelEnvKey: "OPENAI_DEFAULT_MODEL" },
    fallback: { provider: "groq", modelEnvKey: "GROQ_DEFAULT_MODEL" },
    strategy: "fallback-on-error",
    costThresholdUsd: 0.08,
    latencyThresholdMs: 10_000,
    overrideEnvKey: "REPAIR_MODEL_OVERRIDE",
  },
] as const;

export function getStageRouting(stageId: PipelineStageId): StageRoutingEntry | undefined {
  return STAGE_ROUTING_CONFIG.find((entry) => entry.stageId === stageId);
}
