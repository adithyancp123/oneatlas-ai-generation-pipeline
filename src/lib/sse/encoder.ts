import type {
  GenerationCompleteEvent,
  PipelineSSEEvent,
  PipelineSSEEventType,
  SSEWirePayload,
  StageCompleteEvent,
  StageFailedEvent,
  StageStartEvent,
} from "@/types/sse";
import type { PipelineStageId } from "@/types/pipeline";
import type { AppSpec } from "@/types/domain";
import type { RepairLog, ValidationError } from "@/types/job";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

export function toSSEWirePayload(event: PipelineSSEEvent): SSEWirePayload {
  switch (event.type) {
    case "stage_start":
      return {
        stage: event.stage,
        timestamp: event.timestamp,
        data: { jobId: event.jobId },
      };
    case "stage_complete":
      return {
        stage: event.stage,
        timestamp: event.timestamp,
        data: {
          jobId: event.jobId,
          latencyMs: event.latencyMs,
          ...(event.partialOutput !== undefined ? { partialOutput: event.partialOutput } : {}),
          ...(event.providerExecution !== undefined
            ? { providerExecution: event.providerExecution }
            : {}),
        },
      };
    case "stage_failed":
      return {
        stage: event.stage,
        timestamp: event.timestamp,
        data: {
          jobId: event.jobId,
          latencyMs: event.latencyMs,
          errors: event.errors,
          ...(event.repairLog !== undefined ? { repairLog: event.repairLog } : {}),
        },
      };
    case "generation_complete":
      return {
        stage: null,
        timestamp: event.timestamp,
        data: {
          jobId: event.jobId,
          appSpec: event.appSpec,
          totalLatencyMs: event.totalLatencyMs,
          costUsd: event.costUsd,
          ...(event.repairLog !== undefined ? { repairLog: event.repairLog } : {}),
        },
      };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function encodePipelineSSEEvent(event: PipelineSSEEvent): string {
  const wire = toSSEWirePayload(event);
  return `event: ${event.type}\ndata: ${JSON.stringify(wire)}\n\n`;
}

export function encodeSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}

function requireNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`SSE wire payload missing ${key}`);
  }
  return value;
}

/** Decode wire JSON from EventSource into the internal pipeline event shape. */
export function parseSSEWirePayload(
  type: PipelineSSEEventType,
  wire: SSEWirePayload,
  fallbackJobId: string,
): PipelineSSEEvent {
  const jobId = typeof wire.data.jobId === "string" ? wire.data.jobId : fallbackJobId;
  const timestamp = wire.timestamp;

  switch (type) {
    case "stage_start": {
      const stage = (wire.stage ?? wire.data.stage) as PipelineStageId;
      const event: StageStartEvent = {
        type: "stage_start",
        jobId,
        timestamp,
        stage,
      };
      return event;
    }
    case "stage_complete": {
      const stage = (wire.stage ?? wire.data.stage) as PipelineStageId;
      const event: StageCompleteEvent = {
        type: "stage_complete",
        jobId,
        timestamp,
        stage,
        latencyMs: requireNumber(wire.data, "latencyMs"),
      };
      if (wire.data.partialOutput !== undefined) {
        event.partialOutput = wire.data.partialOutput;
      }
      if (wire.data.providerExecution !== undefined) {
        event.providerExecution = wire.data.providerExecution as ProviderExecutionMeta;
      }
      return event;
    }
    case "stage_failed": {
      const stage = (wire.stage ?? wire.data.stage) as PipelineStageId;
      const event: StageFailedEvent = {
        type: "stage_failed",
        jobId,
        timestamp,
        stage,
        latencyMs: requireNumber(wire.data, "latencyMs"),
        errors: wire.data.errors as ValidationError[],
      };
      if (wire.data.repairLog !== undefined) {
        event.repairLog = wire.data.repairLog as RepairLog;
      }
      return event;
    }
    case "generation_complete": {
      const event: GenerationCompleteEvent = {
        type: "generation_complete",
        jobId,
        timestamp,
        appSpec: (wire.data.appSpec as AppSpec | null) ?? null,
        totalLatencyMs: requireNumber(wire.data, "totalLatencyMs"),
        costUsd: requireNumber(wire.data, "costUsd"),
      };
      if (wire.data.repairLog !== undefined) {
        event.repairLog = wire.data.repairLog as RepairLog;
      }
      return event;
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
