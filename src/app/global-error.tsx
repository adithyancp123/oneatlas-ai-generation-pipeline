"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen p-8 font-sans">
        <h1 className="text-lg font-semibold">Application error</h1>
        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
        <button
          type="button"
          className="mt-4 rounded border px-4 py-2 text-sm"
          onClick={reset}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
