"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-foreground/70">
        {error.message || "An unexpected error occurred in the UI."}
      </p>
      <Button type="button" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
