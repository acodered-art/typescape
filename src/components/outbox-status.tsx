"use client";
import { useOutbox } from "@/lib/use-outbox";
import { Typed } from "@/components/dossier";

/**
 * Connectivity + pending-work strip.
 *
 * The app pretends nothing is wrong far less often than most: if a vote is
 * waiting to send, say so. Rendered only when there is something to report so it
 * costs no attention in the normal case.
 */
export function OutboxStatus({ className = "" }: { className?: string }) {
  const { pending, online, flush } = useOutbox();

  if (online && pending === 0) return null;

  return (
    <div className={`flex items-center gap-2 border border-steel bg-paper-2 px-3 py-1.5 ${className}`}>
      <span className={`h-2 w-2 ${online ? "bg-blue" : "bg-steel-2"}`} aria-hidden="true" />
      <Typed className="text-[12px]">
        {!online && "Offline — changes are saved on this device."}
        {online && pending > 0 &&
          `${pending} ${pending === 1 ? "change" : "changes"} waiting to send.`}
      </Typed>
      {online && pending > 0 && (
        <button
          type="button"
          onClick={() => void flush()}
          className="font-typed text-[12px] text-blue underline hover:text-navy"
        >
          Send now
        </button>
      )}
    </div>
  );
}
