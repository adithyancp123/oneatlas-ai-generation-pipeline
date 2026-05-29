import type { PipelineSSEEvent } from "@/types/sse";

export function encodePipelineSSEEvent(event: PipelineSSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function encodeSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}
