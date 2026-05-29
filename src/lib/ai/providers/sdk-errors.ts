import { ProviderRequestError, type ProviderId } from "@/lib/ai/gateway/types";

export function mapSdkError(error: unknown, provider: ProviderId): ProviderRequestError {
  if (error instanceof ProviderRequestError) return error;

  const message = error instanceof Error ? error.message : "SDK request failed";
  const statusCode = extractStatusCode(error);
  const retryable =
    statusCode === 429 ||
    statusCode === 408 ||
    (statusCode !== undefined && statusCode >= 500) ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("connection") ||
    message.toLowerCase().includes("econnrefused") ||
    message.toLowerCase().includes("network") ||
    (error instanceof Error && error.name === "AbortError");

  return new ProviderRequestError(message, provider, statusCode, retryable, error);
}

function extractStatusCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}
