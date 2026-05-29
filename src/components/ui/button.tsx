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
    "inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-900/50 px-4 text-sm font-medium text-zinc-200 transition-[transform,box-shadow,border-color,background-color] duration-[220ms] ease-out hover:-translate-y-px hover:border-zinc-600/80 hover:bg-zinc-800/60 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500/80 disabled:pointer-events-none disabled:opacity-40",
  ghost:
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-zinc-400 transition-[transform,color,background-color] duration-[220ms] ease-out hover:bg-zinc-800/50 hover:text-zinc-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500/80 disabled:pointer-events-none disabled:opacity-40",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
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
          <span>Generating…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
