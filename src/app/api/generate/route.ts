import { after } from "next/server";
import { z } from "zod";
import { MAX_PROMPT_LENGTH } from "@/config/constants";
import { getJobStore, getOrchestrator } from "@/lib/runtime/singleton";
import { jsonError, jsonSuccess } from "@/lib/utils";
import type { GenerateResponse } from "@/types/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const generateBodySchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
});

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);

  const parsed = generateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid request body", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const store = getJobStore();
  const orchestrator = getOrchestrator();
  const job = store.createJob(parsed.data.prompt.trim());

  after(() => orchestrator.startJob(job.id));

  const response: GenerateResponse = {
    jobId: job.id,
    status: "queued",
  };

  return jsonSuccess(response, 202);
}
