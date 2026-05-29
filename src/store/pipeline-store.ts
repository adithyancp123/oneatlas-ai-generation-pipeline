import { create } from "zustand";
import type { AppSpec } from "@/types/domain";
import type { CostBreakdown, RepairLog, StageLatency, ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | null;

export interface PipelineStoreState {
  jobId: string | null;
  status: JobStatus;
  currentStage: PipelineStageId | null;
  prompt: string;
  appSpec: AppSpec | null;
  error: string | null;
  validationErrors: ValidationError[];
  repairLog: RepairLog | null;
  cost: CostBreakdown | null;
  latencies: StageLatency[];
  isGenerating: boolean;
  setPrompt: (prompt: string) => void;
  setJobId: (jobId: string | null) => void;
  setStatus: (status: JobStatus) => void;
  setCurrentStage: (stage: PipelineStageId | null) => void;
  setAppSpec: (spec: AppSpec | null) => void;
  setError: (error: string | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setRepairLog: (log: RepairLog | null) => void;
  setCost: (cost: CostBreakdown | null) => void;
  setLatencies: (latencies: StageLatency[]) => void;
  setIsGenerating: (value: boolean) => void;
  reset: () => void;
}

const initialState: Pick<
  PipelineStoreState,
  | "jobId"
  | "status"
  | "currentStage"
  | "prompt"
  | "appSpec"
  | "error"
  | "validationErrors"
  | "repairLog"
  | "cost"
  | "latencies"
  | "isGenerating"
> = {
  jobId: null,
  status: null,
  currentStage: null,
  prompt: "",
  appSpec: null,
  error: null,
  validationErrors: [],
  repairLog: null,
  cost: null,
  latencies: [],
  isGenerating: false,
};

export const usePipelineStore = create<PipelineStoreState>((set) => ({
  ...initialState,
  setPrompt: (prompt) => set({ prompt }),
  setJobId: (jobId) => set({ jobId }),
  setStatus: (status) => set({ status }),
  setCurrentStage: (currentStage) => set({ currentStage }),
  setAppSpec: (appSpec) => set({ appSpec }),
  setError: (error) => set({ error }),
  setValidationErrors: (validationErrors) => set({ validationErrors }),
  setRepairLog: (repairLog) => set({ repairLog }),
  setCost: (cost) => set({ cost }),
  setLatencies: (latencies) => set({ latencies }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  reset: () => set({ ...initialState }),
}));
