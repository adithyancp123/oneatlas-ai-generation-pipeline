"use client";

import { useCallback, useRef } from "react";
import { MAX_PROMPT_LENGTH } from "@/config/constants";
import {
  extractAppSpecFromEvent,
  fetchJob,
  startGeneration,
  subscribeToJobEvents,
} from "@/lib/api/client";
import { usePipelineStore } from "@/store";
import type { PipelineSSEEvent } from "@/types/sse";

export function useGeneration() {
  const isGenerating = usePipelineStore((s) => s.isGenerating);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const handleEvent = useCallback((event: PipelineSSEEvent) => {
    const store = usePipelineStore.getState();

    if (event.type === "stage_start") {
      store.setCurrentStage(event.stage);
      store.setStatus("running");
      store.setError(null);
    }

    if (event.type === "stage_complete") {
      store.setCurrentStage(event.stage);
      const spec = extractAppSpecFromEvent(event);
      if (spec) store.setAppSpec(spec);
    }

    if (event.type === "stage_failed") {
      store.setCurrentStage(event.stage);
      store.setValidationErrors(event.errors);
      if (event.repairLog) store.setRepairLog(event.repairLog);
      store.setError(`Stage ${event.stage} failed — repair may follow`);
    }

    if (event.type === "generation_complete") {
      store.setStatus(event.appSpec ? "completed" : "failed");
      store.setCurrentStage(null);
      store.setAppSpec(event.appSpec);
      store.setIsGenerating(false);
      cleanup();

      void fetchJob(event.jobId).then((job) => {
        const s = usePipelineStore.getState();
        s.setCost(job.cost);
        s.setLatencies(job.latencies);
        s.setRepairLog(job.repairLog);
        s.setValidationErrors(job.validationErrors);
      });

      if (!event.appSpec) {
        store.setError("Generation finished without a valid AppSpec");
      }
    }
  }, [cleanup]);

  const generate = useCallback(async () => {
    cleanup();
    const store = usePipelineStore.getState();
    const prompt = store.prompt.trim();

    if (!prompt) {
      store.setError("Enter a description before generating");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      store.setError(`Prompt exceeds ${MAX_PROMPT_LENGTH.toLocaleString()} character limit`);
      return;
    }

    store.setError(null);
    store.setValidationErrors([]);
    store.setRepairLog(null);
    store.setAppSpec(null);
    store.setJobId(null);
    store.setCost(null);
    store.setLatencies([]);
    store.setIsGenerating(true);
    store.setStatus("queued");

    try {
      const { jobId } = await startGeneration(prompt);
      store.setJobId(jobId);

      const unsubscribe = subscribeToJobEvents(jobId, handleEvent);

      const pollInterval = setInterval(() => {
        void fetchJob(jobId)
          .then((job) => {
            const s = usePipelineStore.getState();
            s.setStatus(job.status);
            s.setCurrentStage(job.currentStage);
            if (job.appSpec) s.setAppSpec(job.appSpec);
            s.setValidationErrors(job.validationErrors);
            s.setRepairLog(job.repairLog);
            s.setCost(job.cost);
            s.setLatencies(job.latencies);

            if (
              job.status === "completed" ||
              job.status === "failed" ||
              job.status === "cancelled"
            ) {
              clearInterval(pollInterval);
              s.setIsGenerating(false);
              unsubscribe();
            }
          })
          .catch(() => {
            /* SSE is primary; polling is fallback */
          });
      }, 3000);

      cleanupRef.current = () => {
        clearInterval(pollInterval);
        unsubscribe();
      };
    } catch (error) {
      cleanup();
      const s = usePipelineStore.getState();
      s.setIsGenerating(false);
      s.setStatus("failed");
      s.setError(error instanceof Error ? error.message : "Generation failed");
    }
  }, [cleanup, handleEvent]);

  return { generate, isGenerating };
}
