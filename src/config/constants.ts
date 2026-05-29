export const APP_NAME = "AppSpec Pipeline";

export const API_ROUTES = {
  generate: "/api/generate",
  integrations: "/api/integrations",
  job: (jobId: string) => `/api/generate/${jobId}`,
  jobStream: (jobId: string) => `/api/generate/${jobId}/stream`,
  jobRepair: (jobId: string) => `/api/generate/${jobId}/repair`,
} as const;

/** Stages executed in order — repair runs only on validation failure */
export const PIPELINE_EXECUTION_ORDER = [
  "intentExtraction",
  "schemaGeneration",
  "appSpecGeneration",
] as const;

export const PIPELINE_STAGE_ORDER = [
  ...PIPELINE_EXECUTION_ORDER,
  "repair",
] as const;

export const DEFAULT_STREAM_HEARTBEAT_MS = 15_000;

export const MAX_REPAIR_ATTEMPTS = 3;

export const MAX_PROMPT_LENGTH = 10_000;
