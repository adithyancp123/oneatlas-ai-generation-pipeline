import { validatePayloadShape } from "@/lib/integrations/payload-validation";
import {
  getIntegrationAction,
  getIntegrationTrigger,
} from "@/lib/integrations/registry/definitions";
import type {
  IntegrationDefinition,
  IntegrationExecutionResult,
  PayloadShape,
} from "@/types/integrations";
import type { IntegrationAdapter, PayloadValidationResult } from "@/lib/integrations/adapters/types";

export abstract class BaseIntegrationAdapter implements IntegrationAdapter {
  constructor(public readonly definition: IntegrationDefinition) {}

  isConfigured(): boolean {
    return this.definition.requiredEnvKeys.every((key) => {
      const value = process.env[key];
      return typeof value === "string" && value.trim().length > 0;
    });
  }

  validatePayload(
    payload: unknown,
    shape: PayloadShape,
    options?: { requireAllFields?: boolean },
  ): PayloadValidationResult {
    return validatePayloadShape(payload, shape, options);
  }

  execute(
    operationKind: "trigger" | "action",
    operationId: string,
    payload: Record<string, unknown>,
  ): IntegrationExecutionResult {
    const timestamp = new Date().toISOString();
    const operation =
      operationKind === "action"
        ? getIntegrationAction(this.definition.id, operationId)
        : getIntegrationTrigger(this.definition.id, operationId);

    if (!operation) {
      return {
        success: false,
        simulated: true,
        timestamp,
        integrationId: this.definition.id,
        operationId,
        operationKind,
        error: `Unknown ${operationKind}: ${operationId}`,
      };
    }

    const validation = this.validatePayload(payload, operation.inputSchema, {
      requireAllFields: true,
    });

    if (!validation.valid) {
      return {
        success: false,
        simulated: true,
        timestamp,
        integrationId: this.definition.id,
        operationId,
        operationKind,
        errors: validation.errors,
      };
    }

    return this.buildStubResult(operationKind, operationId, payload, timestamp);
  }

  protected buildStubResult(
    operationKind: "trigger" | "action",
    operationId: string,
    payload: Record<string, unknown>,
    timestamp: string,
  ): IntegrationExecutionResult {
    return {
      success: true,
      simulated: true,
      timestamp,
      integrationId: this.definition.id,
      operationId,
      operationKind,
      ...payload,
    };
  }
}
