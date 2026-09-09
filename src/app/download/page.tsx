import type { Metadata } from "next";
import { Btn, PageTitle, Sheet, SectionHead, Typed } from "@/components/dossier";

export const metadata: Metadata = {
  title: "Get the app — TypeScape",
  description: "Install TypeScape on Android.",
  alternates: { canonical: "/download" },
};

/**
 * Android download page.
 *
 * The APK is the site in a WebView, so it exists for one reason: the browser
 * refused to offer a home-screen install. It is not a separate implementation
 * and does not need updating when the site changes — only the URL baked into the
 * shell does.
 */
export default function DownloadPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Get the app" aside="Android" />
      <div className="flex max-w-[720px] flex-col gap-6">
        <Sheet className="flex flex-col gap-4 p-5">
          <SectionHead title="Install on Android" />
          <Typed className="text-md leading-[1.6]">
            Download the APK and open it. Android will ask you to allow installing from this
            source the first time — that is normal for an app that is not in the Play Store yet.
          </Typed>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" href="/downloads/typescape.apk">
              Download APK (18.9 MB)
            </Btn>
            <Typed className="text-sm text-navy">Android 5.0 or newer</Typed>
          </div>
          <div className="border-t border-steel pt-3">
            <Typed className="text-base leading-[1.6]">
              <strong>This is the website in an app window.</strong> It needs the device to be on
              your Tailscale network, because that is where the site is served. It is a test
              build: no Play Store, no auto-update, and it shows an offline screen if Tailscale is
              not connected.
            </Typed>
          </div>
        </Sheet>

        <Sheet className="flex flex-col gap-3 p-5">
          <SectionHead title="Or use the browser" size={20} />
          <Typed className="text-md leading-[1.55]">
            The same site works without installing anything:
          </Typed>
          <Typed className="font-typed text-base">
            https://episteme-1.tail19de5f.ts.net:8444
          </Typed>
        </Sheet>
      </div>
    </div>
  );
}
