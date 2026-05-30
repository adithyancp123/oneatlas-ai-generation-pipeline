import { buildJsonCorrectionPrompt, extractJsonPayload, recoverTruncatedJson } from "@/lib/ai/structured/json-utils";
import { z } from "zod";

function formatParseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issues = error.errors
      .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "root"}: ${issue.message}`)
      .join("; ");
    return `Schema validation failed: ${issues}`;
  }
  if (error instanceof SyntaxError) {
    return `Invalid JSON: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown parse error";
}

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

  let lastError: string | undefined;

  for (const candidate of unique) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const data = schema.parse(parsed);
      return { success: true, data, raw: candidate };
    } catch (error) {
      lastError = formatParseError(error);
    }
  }

  return { success: false, raw: text, error: lastError ?? "Unable to parse JSON" };
}

export function buildStructuredSystemPrompt(schemaName: string): string {
  return [
    `You are a structured data generator. Output valid JSON only for: ${schemaName}.`,
    "Rules: no markdown, no commentary, no trailing commas, double-quoted keys.",
  ].join(" ");
}

export { buildJsonCorrectionPrompt };
