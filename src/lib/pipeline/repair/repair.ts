export { runRepairEngine, type RepairEngineInput, type RepairEngineResult } from "@/lib/pipeline/repair/repair-engine";

/** @deprecated Use runRepairEngine */
export { runRepairEngine as repairAppSpec } from "@/lib/pipeline/repair/repair-engine";

export type RepairInput = import("@/lib/pipeline/repair/repair-engine").RepairEngineInput;
export type RepairResult = import("@/lib/pipeline/repair/repair-engine").RepairEngineResult;
