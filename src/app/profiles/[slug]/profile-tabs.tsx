"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { FolderTab, Sheet, TabStrip } from "@/components/dossier";

export type ProfileTab = "subject" | "findings" | "evidence" | "discussion";
// Only components and types leave this client module: a server page cannot import a plain array across the boundary.
const TABS: ProfileTab[] = ["subject", "findings", "evidence", "discussion"];

const TabContext = createContext<(tab: ProfileTab) => void>(() => {});

/**
 * The four folder tabs on a character's file. The panels arrive server-rendered and stay mounted
 * (their fetches and vote state survive a tab switch); the open tab is client state mirrored into ?tab=.
 */
export function ProfileTabs({ initial, labels, panels }: { initial: ProfileTab; labels: Record<ProfileTab, string>; panels: Record<ProfileTab, ReactNode> }) {
  const [tab, setTab] = useState<ProfileTab>(initial);
  const open = (next: ProfileTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "subject") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };
  return (
    <TabContext.Provider value={open}>
      <TabStrip>
        {TABS.map((t) => (
          <FolderTab key={t} active={tab === t} onClick={() => open(t)}>
            {labels[t]}
          </FolderTab>
        ))}
      </TabStrip>
      <Sheet punched className="flex flex-col gap-[22px]">
        {TABS.map((t) => (
          <div key={t} hidden={tab !== t} className="flex flex-col gap-[22px]">
            {panels[t]}
          </div>
        ))}
      </Sheet>
    </TabContext.Provider>
  );
}

/** A button anywhere on the file that opens one of its tabs ("Open all", "Submit evidence"). */
export function TabLink({ to, className = "", children }: { to: ProfileTab; className?: string; children: ReactNode }) {
  const open = useContext(TabContext);
  return (
    <button type="button" onClick={() => open(to)} className={className}>
      {children}
    </button>
  );
}
