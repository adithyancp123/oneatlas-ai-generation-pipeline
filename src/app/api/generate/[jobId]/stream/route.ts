import { getJobStore } from "@/lib/runtime/singleton";
import { encodePipelineSSEEvent, encodeSSEComment } from "@/lib/sse";
import { createSSEStream, sseResponse } from "@/lib/sse/stream";
import { jsonError } from "@/lib/utils";

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

  const store = getJobStore();
  const job = store.getJob(jobId);

  if (!job) {
    return jsonError("JOB_NOT_FOUND", `Job ${jobId} not found`, 404);
  }

  const stream = createSSEStream((send) => {
    for (const event of store.replayEvents(jobId)) {
      send(encodePipelineSSEEvent(event));
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return;
    }

    return new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe(jobId, (event) => {
        send(encodePipelineSSEEvent(event));
        if (event.type === "generation_complete") {
          unsubscribe();
          resolve();
        }
      });

      send(encodeSSEComment("connected"));
    });
  });

  return sseResponse(stream);
}
