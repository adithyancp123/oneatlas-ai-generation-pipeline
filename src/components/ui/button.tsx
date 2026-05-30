import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  secondary:
    "interactive-surface inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium text-zinc-200 border-zinc-700/60 bg-zinc-900/45 hover:border-zinc-600/75 hover:bg-zinc-800/55 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40",
  ghost:
    "interactive-surface inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-400 hover:bg-zinc-800/45 hover:text-zinc-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        variantClasses[variant],
        !isPrimary && sizeClasses[size],
        isPrimary && loading && "btn-primary-loading",
        className,
      )}
      {...props}
    >
      {loading && isPrimary ? (
        <>
          <span className="btn-spinner" aria-hidden />
          <span>Generating AppSpec…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
