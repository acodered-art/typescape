"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-4">
      <h1 className="text-xl font-bold text-[#ff6b6b]">Something went wrong</h1>
      <pre className="text-xs text-[#7888a0] bg-[#141c2b] p-4 rounded border border-[#1a2234] overflow-auto text-left">
        {error.message}
        {error.digest && `\nDigest: ${error.digest}`}
        {error.stack && `\n\n${error.stack}`}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
