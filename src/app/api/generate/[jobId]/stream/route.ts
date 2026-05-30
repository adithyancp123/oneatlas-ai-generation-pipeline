import type { GenerationJobStatus } from "@/types/job";
import { getJobStore } from "@/lib/runtime/singleton";
import { encodePipelineSSEEvent, encodeSSEComment } from "@/lib/sse";
import { createSSEStream, sseResponse } from "@/lib/sse/stream";
import { jsonError } from "@/lib/utils";
import type { PipelineSSEEvent } from "@/types/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

function isTerminalJobStatus(status: GenerationJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export async function GET(
  request: Request,
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

  const stream = createSSEStream(
    async (send) => {
      let closed = false;
      const subscription = { cancel: (): void => undefined };

      const finish = (): void => {
        if (closed) return;
        closed = true;
        subscription.cancel();
      };

      const emit = (event: PipelineSSEEvent): void => {
        if (closed) return;
        send(encodePipelineSSEEvent(event));

        const current = store.getJob(jobId);
        if (
          event.type === "generation_complete" ||
          (current !== undefined && isTerminalJobStatus(current.status))
        ) {
          finish();
        }
      };

      subscription.cancel = store.subscribe(jobId, emit);

      for (const event of store.replayEvents(jobId)) {
        emit(event);
        if (closed) return;
      }

      const afterReplay = store.getJob(jobId);
      if (afterReplay !== undefined && isTerminalJobStatus(afterReplay.status)) {
        finish();
        return;
      }

      send(encodeSSEComment("connected"));

      await new Promise<void>((resolve) => {
        const tick = setInterval(() => {
          if (closed) {
            clearInterval(tick);
            resolve();
            return;
          }

          const current = store.getJob(jobId);
          if (current !== undefined && isTerminalJobStatus(current.status)) {
            finish();
            clearInterval(tick);
            resolve();
          }
        }, 200);
      });
    },
    { signal: request.signal },
  );

  return sseResponse(stream);
}
