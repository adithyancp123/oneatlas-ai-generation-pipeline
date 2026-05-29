import { buildJsonCorrectionPrompt, extractJsonPayload, recoverTruncatedJson } from "@/lib/ai/structured/json-utils";
import type { z } from "zod";

export interface ParseStructuredResult<T> {
  success: boolean;
  data?: T;
  raw: string;
  error?: string;
}

export function parseStructuredJson<T>(
  text: string,
  schema: z.ZodType<T>,
): ParseStructuredResult<T> {
  const candidates = [extractJsonPayload(text), recoverTruncatedJson(text)].filter(
    (c): c is string => Boolean(c),
  );

  const unique = [...new Set([text.trim(), ...candidates])];

  for (const candidate of unique) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const data = schema.parse(parsed);
      return { success: true, data, raw: candidate };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parse error";
      if (candidate === unique[unique.length - 1]) {
        return { success: false, raw: text, error: message };
      }
    }
  }

  return { success: false, raw: text, error: "Unable to parse JSON" };
}

export function buildStructuredSystemPrompt(schemaName: string): string {
  return [
    `You are a structured data generator. Output valid JSON only for: ${schemaName}.`,
    "Rules: no markdown, no commentary, no trailing commas, double-quoted keys.",
  ].join(" ");
}

export { buildJsonCorrectionPrompt };
