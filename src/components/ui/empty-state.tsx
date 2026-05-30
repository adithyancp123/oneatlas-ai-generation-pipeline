import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Short line describing the successful end state */
  successHint?: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.25}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c2.688-.017 4.987.514 6.337 1.908m-9.86 9.86h.01M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  successHint,
  icon,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("empty-state", compact && "empty-state-compact", className)}
      role="status"
    >
      <div className="empty-state-icon">{icon ?? <DefaultIcon />}</div>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {successHint ? <p className="empty-state-hint">{successHint}</p> : null}
    </div>
  );
}
