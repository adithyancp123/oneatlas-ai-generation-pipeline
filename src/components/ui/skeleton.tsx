import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", shimmer && "skeleton-shimmer", className)}
      aria-hidden
      {...props}
    />
  );
}

export interface SkeletonBlockProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

/** Accessible loading region — use for panel-level skeletons */
export function SkeletonRegion({
  label,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div
      className={className}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      {...props}
    >
      {children}
    </div>
  );
}

export function SkeletonLine({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-3", className)} {...props} />;
}
