import { PageTitle, Btn, Sheet, Typed } from "@/components/dossier";

export const metadata = {
  title: "Offline — TypeScape",
  description: "You are offline.",
};

/** Shown by the service worker when a navigation fails and nothing is cached. */
export default function OfflinePage() {
  return (
    <div className="pb-10">
      <PageTitle title="Offline" aside="No connection." />
      <div className="max-w-[620px]">
        <Sheet className="flex flex-col gap-4 p-5">
          <Typed className="text-[15px] leading-[1.6]">
            This page needs the network. The files you had already opened are still in your
            browser cache, and the app will pick up where it left off when you reconnect.
          </Typed>
          <div>
            <Btn href="/">Try again</Btn>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
