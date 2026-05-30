import type {
  IntegrationDefinition,
  IntegrationExecutionResult,
  PayloadShape,
} from "@/types/integrations";

export interface PayloadValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IntegrationAdapter {
  readonly definition: IntegrationDefinition;
  isConfigured(): boolean;
  validatePayload(
    payload: unknown,
    shape: PayloadShape,
    options?: { requireAllFields?: boolean },
  ): PayloadValidationResult;
  execute(
    operationKind: "trigger" | "action",
    operationId: string,
    payload: Record<string, unknown>,
  ): IntegrationExecutionResult;
}
