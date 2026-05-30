"use client";

import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps {
  className?: string;
}

/** Top-level pipeline error only — validation/repair details live in AppSpecErrorPanel. */
export function ErrorBanner({ className }: ErrorBannerProps) {
  const { error } = usePipeline();

  if (!error) return null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} aria-live="polite">
      <div
        role="alert"
        className="status-banner text-break border-red-500/30 bg-red-500/[0.08] text-red-200"
      >
        {error}
      </div>
    </div>
  );
}
