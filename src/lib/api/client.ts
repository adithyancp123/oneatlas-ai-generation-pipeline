import { API_ROUTES } from "@/config/constants";
import type { ProvidersOverview } from "@/lib/ai/providers/status";
import type { AppSpec } from "@/types/domain";import type { GenerationJob } from "@/types/job";
import type { IntegrationDefinition } from "@/types/integrations";
import type { GenerateResponse } from "@/types/pipeline";
import type { PipelineSSEEvent } from "@/types/sse";

export async function startGeneration(prompt: string): Promise<GenerateResponse> {
  const response = await fetch(API_ROUTES.generate, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to start generation");
  }

  return response.json() as Promise<GenerateResponse>;
}

export async function fetchJob(jobId: string): Promise<GenerationJob> {
  const response = await fetch(API_ROUTES.job(jobId));
  if (!response.ok) {
    throw new Error("Failed to fetch job");
  }
  const body = (await response.json()) as { job: GenerationJob };
  return body.job;
}

export async function fetchIntegrations(): Promise<IntegrationDefinition[]> {
  const response = await fetch(API_ROUTES.integrations);
  if (!response.ok) {
    throw new Error("Failed to fetch integrations");
  }
  const body = (await response.json()) as { integrations: IntegrationDefinition[] };
  return body.integrations;
}

export async function fetchProvidersOverview(): Promise<ProvidersOverview> {
  const response = await fetch(API_ROUTES.providers);
  if (!response.ok) {
    throw new Error("Failed to fetch providers");
  }
  return response.json() as Promise<ProvidersOverview>;
}
export async function triggerRepair(jobId: string): Promise<GenerationJob> {
  const response = await fetch(API_ROUTES.jobRepair(jobId), { method: "POST" });
  if (!response.ok) {
    throw new Error("Repair request failed");
  }
  const body = (await response.json()) as { job: GenerationJob };
  return body.job;
}

export function subscribeToJobEvents(
  jobId: string,
  onEvent: (event: PipelineSSEEvent) => void,
): () => void {
  const source = new EventSource(API_ROUTES.jobStream(jobId));

  const eventTypes: PipelineSSEEvent["type"][] = [
    "stage_start",
    "stage_complete",
    "stage_failed",
    "generation_complete",
  ];

  for (const type of eventTypes) {
    source.addEventListener(type, (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as PipelineSSEEvent;
        onEvent(event);
      } catch {
        /* ignore malformed events */
      }
    });
  }

  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

export function extractAppSpecFromEvent(event: PipelineSSEEvent): AppSpec | null {
  if (event.type === "generation_complete") {
    return event.appSpec;
  }
  if (event.type === "stage_complete" && event.partialOutput) {
    const output = event.partialOutput;
    if (typeof output === "object" && output !== null && "version" in output) {
      return output as AppSpec;
    }
  }
  return null;
}
