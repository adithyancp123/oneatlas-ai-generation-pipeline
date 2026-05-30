import { MAX_REPAIR_ATTEMPTS, PIPELINE_EXECUTION_ORDER } from "@/config/constants";
import { StageCostTracker } from "@/lib/cost";
import { logger } from "@/lib/logging";
import { runRepairEngine } from "@/lib/pipeline/repair";
import type { JobStore } from "@/lib/pipeline/orchestration/job-store";
import {
  appSpecGenerationStage,
  intentExtractionStage,
  schemaGenerationStage,
} from "@/lib/pipeline/stages";
import type { StageContext } from "@/lib/pipeline/stages/types";
import type { AppIntent, AppSpec, DataSchema } from "@/types/domain";
import type { GenerationJob, StageLatency, ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";
import type { ProviderExecutionMeta } from "@/types/provider-execution";
import type {
  GenerationCompleteEvent,
  StageCompleteEvent,
  StageFailedEvent,
  StageStartEvent,
} from "@/types/sse";
import type { PipelineStageResult } from "@/types/pipeline";

export class PipelineOrchestrator {
  constructor(private readonly store: JobStore) {}

  startJob(jobId: string): Promise<void> {
    return this.runJob(jobId).catch((error) => {
      logger.error("Pipeline job failed", {
        jobId,
        error: error instanceof Error ? error.message : "unknown",
      });
      this.store.updateJob(jobId, {
        status: "failed",
        currentStage: null,
        validationErrors: [
          {
            code: "ORCHESTRATOR_ERROR",
            message: error instanceof Error ? error.message : "Pipeline failed",
            field: "orchestrator",
            path: "orchestrator",
          },
        ],
      });
      const completeEvent: GenerationCompleteEvent = {
        type: "generation_complete",
        jobId,
        timestamp: new Date().toISOString(),
        appSpec: null,
        totalLatencyMs: 0,
        costUsd: 0,
      };
      this.store.appendEvent(jobId, completeEvent);
    }).then(() => undefined);
  }

  async runJob(jobId: string): Promise<GenerationJob> {
    const job = this.store.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const costTracker = new StageCostTracker(jobId);
    const jobStart = Date.now();

    this.store.updateJob(jobId, { status: "running", currentStage: "intentExtraction" });

    const context: StageContext = {
      jobId,
      prompt: job.prompt,
      previousOutputs: {},
    };

    let intent: AppIntent | null = null;
    let dataSchema: DataSchema | null = null;
    let appSpec: AppSpec | null = null;
    const latencies: StageLatency[] = [];
    let allErrors: ValidationError[] = [];
    let latestRepairLog: GenerationJob["repairLog"] = job.repairLog ?? null;

    for (const stageId of PIPELINE_EXECUTION_ORDER) {
      this.store.updateJob(jobId, { currentStage: stageId });
      this.emitStageStart(jobId, stageId);

      const stageStart = new Date().toISOString();
      let stageResult: PipelineStageResult<unknown>;

      try {
        if (stageId === "intentExtraction") {
          stageResult = await intentExtractionStage.execute(context, job.prompt);
          if (stageResult.success) {
            intent = stageResult.output as AppIntent;
            context.previousOutputs.intentExtraction = intent;
            this.store.setStageOutput(jobId, stageId, intent);
          }
        } else if (stageId === "schemaGeneration" && intent) {
          stageResult = await schemaGenerationStage.execute(context, intent);
          if (stageResult.success) {
            dataSchema = stageResult.output as DataSchema;
            context.previousOutputs.schemaGeneration = dataSchema;
            this.store.setStageOutput(jobId, stageId, dataSchema);
          }
        } else if (stageId === "appSpecGeneration" && intent && dataSchema) {
          stageResult = await appSpecGenerationStage.execute(context, { intent, dataSchema });
          if (stageResult.success) {
            appSpec = stageResult.output as AppSpec;
            context.previousOutputs.appSpecGeneration = appSpec;
            this.store.setStageOutput(jobId, stageId, appSpec);
          }
        } else {
          throw new Error(`Missing prerequisites for stage ${stageId}`);
        }

        this.recordStageCost(stageId, stageResult, costTracker);
        if (stageResult.providerExecution) {
          this.recordProviderExecution(jobId, stageId, stageResult.providerExecution);
        }

        const stageEnd = new Date().toISOString();
        latencies.push({
          stageId,
          startedAt: stageStart,
          completedAt: stageEnd,
          durationMs: stageResult.durationMs,
        });

        if (!stageResult.success) {
          allErrors = [...allErrors, ...(stageResult.errors ?? [])];
          const repaired = await this.attemptRepair(
            jobId,
            job.prompt,
            intent,
            dataSchema,
            appSpec,
            stageResult.errors ?? [],
            stageId,
            costTracker,
            latencies,
          );
          if (repaired.appSpec) {
            appSpec = repaired.appSpec;
            allErrors = repaired.remainingErrors;
            latestRepairLog = repaired.repairLog ?? latestRepairLog;
            this.emitStageComplete(
              jobId,
              stageId,
              stageResult.durationMs,
              appSpec,
              stageResult.providerExecution ?? repaired.providerExecution,
            );
            continue;
          }

          this.emitStageFailed(jobId, stageId, stageResult.durationMs, allErrors, repaired.repairLog);
          return this.finalizeJob(jobId, "failed", null, allErrors, repaired.repairLog, costTracker, latencies, jobStart);
        }

        this.emitStageComplete(
          jobId,
          stageId,
          stageResult.durationMs,
          stageResult.output,
          stageResult.providerExecution,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stage execution failed";
        allErrors.push({
          code: "STAGE_EXECUTION_ERROR",
          message,
          field: stageId,
          path: stageId,
          stageId,
        });
        this.emitStageFailed(jobId, stageId, Date.now() - Date.parse(stageStart), allErrors);
        return this.finalizeJob(jobId, "failed", null, allErrors, null, costTracker, latencies, jobStart);
      }
    }

    if (appSpec) {
      const validation = await this.validateFinalSpec(appSpec, dataSchema, allErrors);
      if (!validation.valid && intent && dataSchema) {
        const repaired = await this.attemptRepair(
          jobId,
          job.prompt,
          intent,
          dataSchema,
          appSpec,
          validation.errors,
          "appSpecGeneration",
          costTracker,
          latencies,
        );
        appSpec = repaired.appSpec;
        allErrors = repaired.remainingErrors;
        latestRepairLog = repaired.repairLog ?? latestRepairLog;
      }
    }

    const status = appSpec ? "completed" : "failed";
    const preservedRepairLog =
      latestRepairLog ?? this.store.getJob(jobId)?.repairLog ?? null;
    return this.finalizeJob(
      jobId,
      status,
      appSpec,
      allErrors,
      preservedRepairLog,
      costTracker,
      latencies,
      jobStart,
    );
  }

  private recordStageCost(
    stageId: PipelineStageId,
    result: PipelineStageResult<unknown>,
    tracker: StageCostTracker,
  ): void {
    if (!result.usage) return;
    tracker.record(stageId, result.usage.provider, result.usage.model, {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.promptTokens + result.usage.completionTokens,
    });
  }

  private recordProviderExecution(
    jobId: string,
    stageId: PipelineStageId,
    execution: ProviderExecutionMeta,
  ): void {
    const job = this.store.getJob(jobId);
    const existing = job?.providerExecutions ?? [];
    const withoutStage = existing.filter((entry) => entry.stageId !== stageId);
    withoutStage.push({ stageId, ...execution });
    this.store.updateJob(jobId, { providerExecutions: withoutStage });
  }

  private async attemptRepair(
    jobId: string,
    prompt: string,
    intent: AppIntent | null,
    dataSchema: DataSchema | null,
    draftSpec: AppSpec | null,
    errors: ValidationError[],
    sourceStageId: PipelineStageId,
    costTracker: StageCostTracker,
    latencies: StageLatency[],
  ): Promise<{
    appSpec: AppSpec | null;
    remainingErrors: ValidationError[];
    repairLog: GenerationJob["repairLog"];
    providerExecution?: ProviderExecutionMeta;
  }> {
    if (!intent || !dataSchema) {
      return { appSpec: null, remainingErrors: errors, repairLog: null };
    }

    let repairProviderExecution: ProviderExecutionMeta | undefined;

    this.emitStageStart(jobId, "repair");
    const repairStart = new Date().toISOString();

    const rawOutput = this.store.getStageOutput(jobId, sourceStageId);
    const rawStageOutput = typeof rawOutput === "string" ? rawOutput : undefined;

    let lastResult = await runRepairEngine({
      jobId,
      prompt,
      intent,
      dataSchema,
      draftSpec,
      validationErrors: errors,
      existingLog: this.store.getJob(jobId)?.repairLog ?? null,
      repairAttempt: 1,
      sourceStageId,
      ...(rawStageOutput !== undefined ? { rawStageOutput } : {}),
    });
    repairProviderExecution = lastResult.providerExecution ?? repairProviderExecution;

    let repairRound = 1;
    while (!lastResult.repairLog.success && repairRound < MAX_REPAIR_ATTEMPTS) {
      repairRound += 1;
      lastResult = await runRepairEngine({
        jobId,
        prompt,
        intent,
        dataSchema,
        draftSpec: lastResult.appSpec,
        validationErrors: lastResult.remainingErrors,
        existingLog: lastResult.repairLog,
        repairAttempt: repairRound,
        sourceStageId,
        ...(rawStageOutput !== undefined ? { rawStageOutput } : {}),
      });
      repairProviderExecution = lastResult.providerExecution ?? repairProviderExecution;
    }

    if (repairProviderExecution) {
      this.recordProviderExecution(jobId, "repair", repairProviderExecution);
    }

    void costTracker;

    latencies.push({
      stageId: "repair",
      startedAt: repairStart,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - Date.parse(repairStart),
    });

    this.store.updateJob(jobId, { repairLog: lastResult.repairLog });

    if (lastResult.appSpec) {
      this.emitStageComplete(
        jobId,
        "repair",
        Date.now() - Date.parse(repairStart),
        lastResult.appSpec,
        repairProviderExecution,
      );
    } else {
      this.emitStageFailed(
        jobId,
        "repair",
        Date.now() - Date.parse(repairStart),
        lastResult.remainingErrors,
        lastResult.repairLog,
      );
    }

    return {
      appSpec: lastResult.appSpec,
      remainingErrors: lastResult.remainingErrors,
      repairLog: lastResult.repairLog,
      ...(repairProviderExecution !== undefined ? { providerExecution: repairProviderExecution } : {}),
    };
  }

  private async validateFinalSpec(
    appSpec: AppSpec,
    canonicalDataSchema: DataSchema | null,
    existing: ValidationError[],
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const { validateAppSpecOutput } = await import("@/lib/pipeline/validators/stage-validator");
    const result = validateAppSpecOutput(
      appSpec,
      canonicalDataSchema ? { canonicalDataSchema } : undefined,
    );
    return {
      valid: result.valid,
      errors: [...existing, ...result.errors],
    };
  }

  private finalizeJob(
    jobId: string,
    status: GenerationJob["status"],
    appSpec: AppSpec | null,
    validationErrors: ValidationError[],
    repairLog: GenerationJob["repairLog"],
    costTracker: StageCostTracker,
    latencies: StageLatency[],
    jobStart: number,
  ): GenerationJob {
    const cost = costTracker.getBreakdown();
    const updated = this.store.updateJob(jobId, {
      status,
      appSpec,
      validationErrors,
      repairLog,
      cost,
      latencies,
      currentStage: null,
    });

    const completeEvent: GenerationCompleteEvent = {
      type: "generation_complete",
      jobId,
      timestamp: new Date().toISOString(),
      appSpec,
      totalLatencyMs: Date.now() - jobStart,
      costUsd: cost.totalUsd,
      ...(repairLog !== undefined && repairLog !== null ? { repairLog } : {}),
    };
    this.store.appendEvent(jobId, completeEvent);

    if (!updated) throw new Error(`Job not found after finalize: ${jobId}`);
    return updated;
  }

  private emitStageStart(jobId: string, stage: PipelineStageId): void {
    const event: StageStartEvent = {
      type: "stage_start",
      jobId,
      stage,
      timestamp: new Date().toISOString(),
    };
    this.store.appendEvent(jobId, event);
  }

  private emitStageComplete(
    jobId: string,
    stage: PipelineStageId,
    latencyMs: number,
    partialOutput: unknown,
    providerExecution?: ProviderExecutionMeta,
  ): void {
    const event: StageCompleteEvent = {
      type: "stage_complete",
      jobId,
      stage,
      latencyMs,
      partialOutput,
      timestamp: new Date().toISOString(),
      ...(providerExecution !== undefined ? { providerExecution } : {}),
    };
    this.store.appendEvent(jobId, event);
  }

  private emitStageFailed(
    jobId: string,
    stage: PipelineStageId,
    latencyMs: number,
    errors: ValidationError[],
    repairLog?: GenerationJob["repairLog"],
  ): void {
    const event: StageFailedEvent = {
      type: "stage_failed",
      jobId,
      stage,
      latencyMs,
      errors,
      timestamp: new Date().toISOString(),
      ...(repairLog !== undefined && repairLog !== null ? { repairLog } : {}),
    };
    this.store.appendEvent(jobId, event);
  }
}

export function createOrchestrator(store: JobStore): PipelineOrchestrator {
  return new PipelineOrchestrator(store);
}
