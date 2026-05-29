"use client";

import { MAX_PROMPT_LENGTH } from "@/config/constants";
import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";

export interface PromptInputProps {
  className?: string;
  disabled?: boolean;
}

export function PromptInput({ className, disabled }: PromptInputProps) {
  const { prompt, setPrompt, isGenerating } = usePipeline();
  const atLimit = prompt.length >= MAX_PROMPT_LENGTH;

  return (
    <div className={cn("space-y-2", className)}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
        disabled={disabled ?? isGenerating}
        placeholder="Example: CRM for real estate with Slack notifications and Stripe billing"
        rows={6}
        className={cn(
          "w-full resize-y rounded-lg border border-foreground/15 bg-transparent px-4 py-3 text-sm leading-relaxed outline-none focus:border-foreground/40",
          atLimit && "border-amber-500/40",
        )}
      />
      <p className={cn("text-xs text-foreground/50", atLimit && "text-amber-700 dark:text-amber-300")}>
        {prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()} characters
      </p>
    </div>
  );
}
