import { hasApiKey, hasGeminiApiKey } from "@/config/env";
import { logger } from "@/lib/logging";
import { createJobStore, type JobStore } from "@/lib/pipeline/orchestration/job-store";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestration/orchestrator";

/** Cross-bundle singleton keys (shared across serverless route bundles on one instance). */
const JOB_STORE_KEY = Symbol.for("appspec.pipeline.jobStore");
const ORCHESTRATOR_KEY = Symbol.for("appspec.pipeline.orchestrator");
const PROVIDER_CONFIG_LOGGED_KEY = Symbol.for("appspec.pipeline.providerConfigLogged");

type RuntimeGlobal = typeof globalThis & {
  [JOB_STORE_KEY]?: JobStore;
  [ORCHESTRATOR_KEY]?: PipelineOrchestrator;
  [PROVIDER_CONFIG_LOGGED_KEY]?: boolean;
};

const globalRuntime = globalThis as RuntimeGlobal;

function logProviderConfigOnce(): void {
  if (globalRuntime[PROVIDER_CONFIG_LOGGED_KEY]) return;
  globalRuntime[PROVIDER_CONFIG_LOGGED_KEY] = true;

  logger.info("Provider configuration", {
    openai: hasApiKey("OPENAI_API_KEY") ? "real" : "mock",
    groq: hasApiKey("GROQ_API_KEY") ? "real" : "mock",
    gemini: hasGeminiApiKey() ? "real" : "mock",
  });
}

export function getJobStore(): JobStore {
  if (!globalRuntime[JOB_STORE_KEY]) {
    globalRuntime[JOB_STORE_KEY] = createJobStore();
  }
  return globalRuntime[JOB_STORE_KEY];
}

export function getOrchestrator(): PipelineOrchestrator {
  if (!globalRuntime[ORCHESTRATOR_KEY]) {
    logProviderConfigOnce();
    globalRuntime[ORCHESTRATOR_KEY] = new PipelineOrchestrator(getJobStore());
  }
  return globalRuntime[ORCHESTRATOR_KEY];
}
