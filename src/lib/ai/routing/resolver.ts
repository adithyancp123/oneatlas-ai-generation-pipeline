import { getEnvValue } from "@/config/env";
import { getStageRouting, type ModelRef, type StageRoutingEntry } from "@/config/routing";
import type { PipelineStageId } from "@/types/pipeline";

export interface ResolvedModelRoute {
  stageId: PipelineStageId;
  provider: string;
  model: string;
  strategy: StageRoutingEntry["strategy"];
  costThresholdUsd: number;
  latencyThresholdMs: number;
  usedFallback: boolean;
}

function resolveModelFromRef(ref: ModelRef, overrideEnvKey?: string): string {
  const override = overrideEnvKey ? getEnvValue(overrideEnvKey) : undefined;
  if (override) return override;
  return getEnvValue(ref.modelEnvKey) ?? "";
}

export function resolveRoute(stageId: PipelineStageId): ResolvedModelRoute {
  const entry = getStageRouting(stageId);
  if (!entry) {
    return {
      stageId,
      provider: "openai",
      model: getEnvValue("OPENAI_DEFAULT_MODEL") ?? "",
      strategy: "primary-first",
      costThresholdUsd: 0,
      latencyThresholdMs: 0,
      usedFallback: false,
    };
  }

  return {
    stageId,
    provider: entry.primary.provider,
    model: resolveModelFromRef(entry.primary, entry.overrideEnvKey),
    strategy: entry.strategy,
    costThresholdUsd: entry.costThresholdUsd,
    latencyThresholdMs: entry.latencyThresholdMs,
    usedFallback: false,
  };
}

export function resolveFallbackRoute(stageId: PipelineStageId): ResolvedModelRoute {
  const entry = getStageRouting(stageId);
  if (!entry) {
    return resolveRoute(stageId);
  }

  return {
    stageId,
    provider: entry.fallback.provider,
    model: resolveModelFromRef(entry.fallback, entry.overrideEnvKey),
    strategy: entry.strategy,
    costThresholdUsd: entry.costThresholdUsd,
    latencyThresholdMs: entry.latencyThresholdMs,
    usedFallback: true,
  };
}
