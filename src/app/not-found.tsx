import Link from "next/link";
import { Btn, Sheet, Typed } from "@/components/dossier";

/** Nothing is filed at this address. */
export default function NotFound() {
  return (
    <div className="pb-10 pt-9">
      <div className="max-w-[560px]">
        <Sheet className="flex flex-col gap-4">
          <div className="font-display text-[48px] font-extrabold uppercase leading-none">No such file.</div>
          <Typed className="text-[14px] leading-[1.5]">
            Nothing is filed at this address. It may have been removed, or the address has a typo.{" "}
            <Link href="/" className="underline">Back to the cabinet</Link>.
          </Typed>
          <div className="flex justify-end border-t-2 border-ink pt-4">
            <Btn variant="primary" href="/search">Browse the files</Btn>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
