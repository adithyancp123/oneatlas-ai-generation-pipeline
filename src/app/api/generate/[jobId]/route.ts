import { getJobStore } from "@/lib/runtime/singleton";
import { jsonError, jsonSuccess } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { jobId } = await context.params;

  if (!jobId) {
    return jsonError("INVALID_JOB_ID", "Job ID is required", 400);
  }

  const job = getJobStore().getJob(jobId);
  if (!job) {
    return jsonError("JOB_NOT_FOUND", `Job ${jobId} not found`, 404);
  }

  return jsonSuccess({ job });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { jobId } = await context.params;

  if (!jobId) {
    return jsonError("INVALID_JOB_ID", "Job ID is required", 400);
  }

  const updated = getJobStore().updateJob(jobId, {
    status: "cancelled",
    currentStage: null,
  });

  if (!updated) {
    return jsonError("JOB_NOT_FOUND", `Job ${jobId} not found`, 404);
  }

  return jsonSuccess({ jobId, cancelled: true });
}
