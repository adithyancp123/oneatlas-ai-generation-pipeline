import { getJobStore } from "@/lib/runtime/singleton";
import { runRepairEngine } from "@/lib/pipeline/repair";
import type { AppIntent, DataSchema } from "@/types/domain";
import { jsonError, jsonSuccess } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { jobId } = await context.params;

  if (!jobId) {
    return jsonError("INVALID_JOB_ID", "Job ID is required", 400);
  }

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

  const nextRepairAttempt =
    (job.repairLog?.entries.reduce((max, e) => Math.max(max, e.attempt), 0) ?? 0) + 1;

  const result = await runRepairEngine({
    jobId,
    prompt: job.prompt,
    intent,
    dataSchema,
    draftSpec: job.appSpec,
    validationErrors: job.validationErrors,
    existingLog: job.repairLog,
    repairAttempt: nextRepairAttempt,
    sourceStageId: "appSpecGeneration",
  });

  const updated = store.updateJob(jobId, {
    appSpec: result.appSpec,
    repairLog: result.repairLog,
    validationErrors: result.remainingErrors,
    status: result.appSpec ? "completed" : "failed",
    currentStage: null,
  });

  return jsonSuccess({ job: updated, repairLog: result.repairLog }, 200);
}
