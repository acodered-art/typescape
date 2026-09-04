"use client";
import Link from "next/link";
import { Btn, PageTitle, Sheet, Typed } from "@/components/dossier";

/** The route error boundary: what went wrong, on paper, with the way back. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pb-10">
      <PageTitle title="Something went wrong" />
      <div className="max-w-[640px]">
        <Sheet className="flex flex-col gap-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-steel bg-paper-2 p-3 font-typed text-[13px] leading-[1.5] text-ink">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
          <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Typed>
              <Link href="/" className="underline">Back to the cabinet</Link>.
            </Typed>
            <Btn variant="primary" onClick={reset}>Try again</Btn>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
