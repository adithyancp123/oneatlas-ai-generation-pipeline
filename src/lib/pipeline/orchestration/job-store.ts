import { v4 as uuidv4 } from "uuid";
import type { GenerationJob } from "@/types/job";
import type { PipelineSSEEvent } from "@/types/sse";

export type JobEventListener = (event: PipelineSSEEvent) => void;

interface StoredJob extends GenerationJob {
  events: PipelineSSEEvent[];
  stageOutputs: Record<string, unknown>;
}

export interface JobStore {
  createJob(prompt: string): GenerationJob;
  updateJob(jobId: string, patch: Partial<GenerationJob>): GenerationJob | undefined;
  getJob(jobId: string): GenerationJob | undefined;
  listJobs(): GenerationJob[];
  appendEvent(jobId: string, event: PipelineSSEEvent): void;
  replayEvents(jobId: string): PipelineSSEEvent[];
  subscribe(jobId: string, listener: JobEventListener): () => void;
  setStageOutput(jobId: string, stageId: string, output: unknown): void;
  getStageOutput(jobId: string, stageId: string): unknown;
}

export function createJobStore(): JobStore {
  const jobs = new Map<string, StoredJob>();
  const listeners = new Map<string, Set<JobEventListener>>();

  function notify(jobId: string, event: PipelineSSEEvent): void {
    const subs = listeners.get(jobId);
    if (subs) {
      for (const listener of subs) {
        listener(event);
      }
    }
  }

  return {
    createJob(prompt) {
      const now = new Date().toISOString();
      const job: StoredJob = {
        id: uuidv4(),
        status: "queued",
        prompt,
        currentStage: null,
        appSpec: null,
        validationErrors: [],
        repairLog: null,
        cost: null,
        latencies: [],
        createdAt: now,
        updatedAt: now,
        events: [],
        stageOutputs: {},
      };
      jobs.set(job.id, job);
      return job;
    },

    updateJob(jobId, patch) {
      const existing = jobs.get(jobId);
      if (!existing) return undefined;
      const updated: StoredJob = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, updated);
      return updated;
    },

    getJob(jobId) {
      return jobs.get(jobId);
    },

    listJobs() {
      return Array.from(jobs.values()).map((stored) => {
        const { events: _events, stageOutputs: _outputs, ...job } = stored;
        void _events;
        void _outputs;
        return job;
      });
    },

    appendEvent(jobId, event) {
      const job = jobs.get(jobId);
      if (!job) return;
      job.events.push(event);
      job.updatedAt = new Date().toISOString();
      notify(jobId, event);
    },

    replayEvents(jobId) {
      const job = jobs.get(jobId);
      return job ? [...job.events] : [];
    },

    subscribe(jobId, listener) {
      if (!listeners.has(jobId)) listeners.set(jobId, new Set());
      listeners.get(jobId)?.add(listener);
      return () => {
        listeners.get(jobId)?.delete(listener);
      };
    },

    setStageOutput(jobId, stageId, output) {
      const job = jobs.get(jobId);
      if (job) job.stageOutputs[stageId] = output;
    },

    getStageOutput(jobId, stageId) {
      return jobs.get(jobId)?.stageOutputs[stageId];
    },
  };
}
