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
      variant="primary"
      loading={isGenerating}
      disabled={isGenerating || prompt.trim().length === 0}
      aria-label={isGenerating ? "Generating AppSpec" : "Generate AppSpec from prompt"}
      onClick={() => void generate()}
    >
      {isGenerating ? undefined : "Generate AppSpec"}
    </Button>
  );
}
