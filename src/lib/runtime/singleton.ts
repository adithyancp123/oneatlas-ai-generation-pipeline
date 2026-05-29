import { hasApiKey, hasGeminiApiKey } from "@/config/env";
import { logger } from "@/lib/logging";
import { createJobStore, type JobStore } from "@/lib/pipeline/orchestration/job-store";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestration/orchestrator";

interface RuntimeGlobal {
  jobStore?: JobStore;
  orchestrator?: PipelineOrchestrator;
  providerConfigLogged?: boolean;
}

const globalRuntime = globalThis as typeof globalThis & RuntimeGlobal;

function logProviderConfigOnce(): void {
  if (globalRuntime.providerConfigLogged) return;
  globalRuntime.providerConfigLogged = true;

  logger.info("Provider configuration", {
    openai: hasApiKey("OPENAI_API_KEY") ? "real" : "mock",
    groq: hasApiKey("GROQ_API_KEY") ? "real" : "mock",
    gemini: hasGeminiApiKey() ? "real" : "mock",
  });
}
export function getJobStore(): JobStore {
  if (!globalRuntime.jobStore) {
    globalRuntime.jobStore = createJobStore();
  }
  return globalRuntime.jobStore;
}

export function getOrchestrator(): PipelineOrchestrator {
  if (!globalRuntime.orchestrator) {
    logProviderConfigOnce();
    globalRuntime.orchestrator = new PipelineOrchestrator(getJobStore());
  }
  return globalRuntime.orchestrator;
}