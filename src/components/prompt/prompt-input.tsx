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
    <div className={cn("space-y-3", className)}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
        disabled={disabled ?? isGenerating}
        placeholder="Example: CRM for real estate with Slack notifications and Stripe billing"
        rows={6}
        className={cn(
          "input-base min-h-[148px] resize-y",
          atLimit && "border-amber-500/45 focus:border-amber-500/45 focus:ring-amber-500/15",
        )}
      />
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-zinc-500">Plain-text prompt</span>
        <span
          className={cn(
            "shrink-0 tabular-nums text-zinc-500 transition-colors duration-200",
            atLimit && "font-medium text-amber-400",
          )}
        >
          {prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
