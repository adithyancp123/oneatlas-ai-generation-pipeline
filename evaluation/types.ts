export interface EvaluationRunRecord {
  prompt: string;
  promptId: string;
  success: boolean;
  failedStage: string | null;
  repairStrategy: string | null;
  retryCount: number;
  latencyMs: number;
  tokenCostUsd: number;
  integrationsDetected: string[];
}

export interface EvaluationResults {
  ranAt: string;
  total: number;
  succeeded: number;
  failed: number;
  successRate: number;
  runs: EvaluationRunRecord[];
}
