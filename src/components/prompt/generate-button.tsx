"use client";

import { useGeneration } from "@/hooks/use-generation";
import { usePipeline } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui";

export function GenerateButton() {
  const { prompt, isGenerating } = usePipeline();
  const { generate } = useGeneration();

  return (
    <Button
      type="button"
      disabled={isGenerating || prompt.trim().length === 0}
      onClick={() => void generate()}
    >
      {isGenerating ? "Generating…" : "Generate"}
    </Button>
  );
}
