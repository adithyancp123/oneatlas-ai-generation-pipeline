import { createJobStore, type JobStore } from "@/lib/pipeline/orchestration/job-store";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestration/orchestrator";

interface RuntimeGlobal {
  jobStore?: JobStore;
  orchestrator?: PipelineOrchestrator;
}

const globalRuntime = globalThis as typeof globalThis & RuntimeGlobal;

export function getJobStore(): JobStore {
  if (!globalRuntime.jobStore) {
    globalRuntime.jobStore = createJobStore();
  }
  return globalRuntime.jobStore;
}

export function getOrchestrator(): PipelineOrchestrator {
  if (!globalRuntime.orchestrator) {
    globalRuntime.orchestrator = new PipelineOrchestrator(getJobStore());
  }
  return globalRuntime.orchestrator;
}
