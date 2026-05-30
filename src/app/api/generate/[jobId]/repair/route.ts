import { z } from "zod";
import { getJobStore } from "@/lib/runtime/singleton";
import { runRepairEngine } from "@/lib/pipeline/repair";
import { validateStageOutput } from "@/lib/pipeline/validators/stage-validator";
import type { AppIntent, AppSpec, DataSchema } from "@/types/domain";
import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";
import { jsonError, jsonSuccess } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

const repairBodySchema = z.object({
  stage: z.enum(["intentExtraction", "schemaGeneration", "appSpecGeneration", "repair"]),
  errorHint: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { jobId } = await context.params;

  if (!jobId) {
    return jsonError("INVALID_JOB_ID", "Job ID is required", 400);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = repairBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Body must include { stage, errorHint? }", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const { stage, errorHint } = parsed.data;
  const store = getJobStore();
  const job = store.getJob(jobId);

  if (!job) {
    return jsonError("JOB_NOT_FOUND", `Job ${jobId} not found`, 404);
  }

  const intent = store.getStageOutput(jobId, "intentExtraction") as AppIntent | undefined;
  const dataSchema = store.getStageOutput(jobId, "schemaGeneration") as DataSchema | undefined;

  if (!intent || !dataSchema) {
    return jsonError(
      "MISSING_STAGE_OUTPUT",
      "Intent and schema outputs required before repair",
      400,
    );
  }

  const stageOutput = store.getStageOutput(jobId, stage);
  if (stageOutput === undefined) {
    return jsonError(
      "MISSING_STAGE_OUTPUT",
      `No stored output for stage ${stage}`,
      400,
    );
  }

  const validation = validateStageOutput(stage, stageOutput, {
    canonicalDataSchema: dataSchema,
  });

  const validationErrors: ValidationError[] = [...validation.errors];
  if (errorHint) {
    validationErrors.push({
      code: "manual_hint",
      message: errorHint,
      field: stage,
      path: stage,
      stageId: stage as PipelineStageId,
    });
  }

  if (validationErrors.length === 0) {
    return jsonError("NO_VALIDATION_ERRORS", "No validation errors to repair for this stage", 400);
  }

  const rawStageOutput =
    typeof stageOutput === "string" ? stageOutput : JSON.stringify(stageOutput);

  const draftSpec: Partial<AppSpec> | null =
    stage === "appSpecGeneration" && typeof stageOutput === "object"
      ? (stageOutput as AppSpec)
      : job.appSpec;

  const nextRepairAttempt =
    (job.repairLog?.entries.reduce((max, e) => Math.max(max, e.attempt), 0) ?? 0) + 1;

  const result = await runRepairEngine({
    jobId,
    prompt: job.prompt,
    intent,
    dataSchema,
    draftSpec,
    validationErrors,
    existingLog: job.repairLog,
    repairAttempt: nextRepairAttempt,
    sourceStageId: stage === "repair" ? "appSpecGeneration" : stage,
    rawStageOutput,
  });

  const updated = store.updateJob(jobId, {
    appSpec: result.appSpec,
    repairLog: result.repairLog,
    validationErrors: result.remainingErrors,
    status: result.appSpec ? "completed" : "failed",
    currentStage: null,
  });

  return jsonSuccess(
    {
      job: updated,
      stage,
      repairLog: result.repairLog,
      entries: result.repairLog.entries,
      success: result.repairLog.success,
    },
    200,
  );
}
