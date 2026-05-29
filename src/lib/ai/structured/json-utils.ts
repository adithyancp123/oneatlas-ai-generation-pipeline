/**
 * JSON extraction and recovery utilities for structured LLM output.
 */

export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (start === -1) return trimmed;

  const opener = trimmed[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) depth += 1;
    if (char === closer) {
      depth -= 1;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  return trimmed.slice(start);
}

export function recoverTruncatedJson(text: string): string | null {
  const extracted = extractJsonPayload(text);
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of extracted) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") stack.push(char);
    if (char === "}" && stack[stack.length - 1] === "{") stack.pop();
    if (char === "]" && stack[stack.length - 1] === "[") stack.pop();
  }

  if (stack.length === 0) return null;

  let repaired = extracted;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const opener = stack[i];
    repaired += opener === "{" ? "}" : "]";
  }
  return repaired;
}

export function buildJsonCorrectionPrompt(invalidJson: string, errorMessage: string): string {
  return [
    "The previous response was invalid JSON. Return ONLY valid JSON with no markdown.",
    `Parse error: ${errorMessage}`,
    "Invalid output:",
    invalidJson.slice(0, 2000),
  ].join("\n");
}
