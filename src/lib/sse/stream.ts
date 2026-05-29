import { DEFAULT_STREAM_HEARTBEAT_MS } from "@/config/constants";
import { encodeSSEComment } from "@/lib/sse/encoder";

export interface SSEStreamOptions {
  heartbeatMs?: number;
  signal?: AbortSignal;
}

export function createSSEStream(
  onSubscribe: (send: (chunk: string) => void) => void | Promise<void>,
  options: SSEStreamOptions = {},
): ReadableStream<Uint8Array> {
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_STREAM_HEARTBEAT_MS;
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const send = (chunk: string): void => {
        controller.enqueue(encoder.encode(chunk));
      };

      const heartbeat = setInterval(() => {
        send(encodeSSEComment("heartbeat"));
      }, heartbeatMs);

      const cleanup = (): void => {
        clearInterval(heartbeat);
      };

      options.signal?.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });

      void Promise.resolve(onSubscribe(send))
        .then(() => {
          cleanup();
          controller.close();
        })
        .catch(() => {
          cleanup();
          controller.error(new Error("SSE stream failed"));
        });
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
