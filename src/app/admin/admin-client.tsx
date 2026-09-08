"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Btn, FolderTab, PageTitle, SectionHead, Sheet, TabStrip, Typed } from "@/components/dossier";
import { FormNote, Modal, SelectPaper } from "@/components/dossier/modal";
import { fetchWithCsrf } from "@/lib/csrf-client";

/**
 * The admin desk.
 *
 * Split by blast radius, following how Wikipedia separates a sysop's content
 * powers from bureaucrat/oversight powers: ordinary moderation lives on /mod and
 * is not duplicated here. This desk covers people, the record, and the site.
 *
 * Anything destructive asks for a reason first — the reason is what makes an
 * audit log useful six months later.
 */

interface StatsData {
  counts: Record<string, number>;
  topTypings: { typingSystemId: string; typeValue: string; _count: { id: number } }[];
}

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  effectiveStatus: string;
  statusUntil: string | null;
  statusReason: string | null;
  reputation: number;
  plan: string;
  createdAt: string;
  _count: { comments: number; typings: number; votes: number };
}

interface PendingImage {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageUploadedBy: string | null;
  imageModeration: string;
}

interface AuditRow {
  id: string;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface Maintenance {
  counts: Record<string, number>;
  health: { database: string; search: string };
  lastAction: string | null;
  lastActionName: string | null;
  actions: string[];
}

const WORDS: Record<string, [string, string]> = {
  profiles: ["file", "files"],
  typings: ["read", "reads"],
  votes: ["vote", "votes"],
  users: ["reader", "readers"],
  comments: ["note", "notes"],
  evidence: ["exhibit", "exhibits"],
  collections: ["collection", "collections"],
  groups: ["group", "groups"],
};

function countsSentence(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(([k, v]) => {
    const w = WORDS[k];
    return w ? `${v} ${v === 1 ? w[0] : w[1]}` : `${v} ${k}`;
  });
  if (parts.length === 0) return "Nothing on the record.";
  if (parts.length === 1) return `${parts[0]} on the record.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]} on the record.`;
}

const stamp = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");

const STATUS_LABEL: Record<string, string> = {
  active: "active",
  timeout: "timed out",
  banned: "banned",
};

type Tab = "record" | "readers" | "audit" | "maintenance";

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditFilter, setAuditFilter] = useState("");
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [tab, setTab] = useState<Tab>("record");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonPrompt, setReasonPrompt] = useState<{
    title: string;
    body: (reason: string) => Promise<void>;
  } | null>(null);
  const [reason, setReason] = useState("");

  const loadImages = useCallback(async () => {
    const res = await fetch("/api/admin/images").catch(() => null);
    if (res?.ok) setPendingImages(await res.json());
  }, []);

  const loadUsers = useCallback(async (q = "") => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`).catch(() => null);
    if (res?.ok) setUsers((await res.json()).data ?? []);
  }, []);

  const loadAudit = useCallback(async (action = "") => {
    const res = await fetch(`/api/admin/audit?action=${encodeURIComponent(action)}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setAuditRows(d.data ?? []);
      setAuditActions(d.meta?.actions ?? []);
    }
  }, []);

  const loadMaintenance = useCallback(async () => {
    const res = await fetch("/api/admin/maintenance").catch(() => null);
    if (res?.ok) setMaintenance((await res.json()).data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sRes] = await Promise.all([
        fetch("/api/admin/stats").catch(() => null),
        loadImages(),
        loadUsers(),
        loadAudit(),
        loadMaintenance(),
      ]);
      if (!cancelled && sRes?.ok) setStats(await sRes.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [loadImages, loadUsers, loadAudit, loadMaintenance]);

  /** Ask for a reason before anything that will be logged. */
  const withReason = (title: string, body: (reason: string) => Promise<void>) => {
    setReason("");
    setReasonPrompt({ title, body });
  };

  const runReasoned = async () => {
    const prompt = reasonPrompt;
    if (!prompt) return;
    setBusy(true);
    setNote("");
    try {
      await prompt.body(reason.trim());
    } finally {
      setBusy(false);
      setReasonPrompt(null);
      setReason("");
    }
  };

  const patchUser = async (userId: string, payload: Record<string, unknown>) => {
    const res = await fetchWithCsrf("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNote(d.error || "That did not go through.");
      return;
    }
    await loadUsers(userQuery);
    await loadAudit();
  };

  const runMaintenance = async (action: string) => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetchWithCsrf("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setNote(d.error || "That did not run.");
      else {
        const r = (d.data?.result ?? {}) as Record<string, unknown>;
        setNote(`${action}: ${Object.entries(r).map(([k, v]) => `${k} ${v}`).join(", ") || "done"}`);
        await loadMaintenance();
        await loadAudit();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-10">
      <PageTitle title="Admin" aside={stats ? countsSentence(stats.counts) : "Opening the desk."} />
      <TabStrip className="pt-0">
        <FolderTab active={tab === "record"} onClick={() => setTab("record")}>Record</FolderTab>
        <FolderTab active={tab === "readers"} onClick={() => setTab("readers")}>Readers</FolderTab>
        <FolderTab active={tab === "audit"} onClick={() => setTab("audit")}>Audit log</FolderTab>
        <FolderTab active={tab === "maintenance"} onClick={() => setTab("maintenance")}>Site</FolderTab>
      </TabStrip>

      {note && (
        <div className="mb-3">
          <FormNote>{note}</FormNote>
        </div>
      )}

      <Sheet className="flex flex-col gap-[14px] p-4">
        {tab === "record" && (
          <>
            <SectionHead title="Most filed reads" aside={stats ? `${stats.topTypings.length} listed` : undefined} />
            {!stats ? (
              <Typed>Opening the record.</Typed>
            ) : stats.topTypings.length === 0 ? (
              <Typed className="text-[14px]">No reads on the record yet.</Typed>
            ) : (
              stats.topTypings.map((t, i) => (
                <div key={`${t.typingSystemId}-${t.typeValue}`} className="row-fill flex items-baseline justify-between gap-4 px-3 py-[10px]">
                  <span className="font-typed text-[22px] font-bold">{t.typeValue}</span>
                  <Typed>
                    {t._count.id} {t._count.id === 1 ? "read" : "reads"}, {i + 1}
                    {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}
                  </Typed>
                </div>
              ))
            )}

            <SectionHead title="Portraits awaiting review" size={20} />
            {pendingImages.length === 0 ? (
              <Typed className="text-[14px]">Nothing waiting.</Typed>
            ) : (
              pendingImages.map((img) => (
                <div key={img.id} className="row-fill flex items-center justify-between gap-3 px-3 py-2">
                  <Link href={`/profiles/${img.slug}`} className="text-[15px] underline">{img.name}</Link>
                  <div className="flex gap-2">
                    <Btn
                      variant="small"
                      onClick={async () => {
                        await fetchWithCsrf("/api/admin/images", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ profileId: img.id, action: "approve" }),
                        });
                        await loadImages();
                      }}
                    >
                      Approve
                    </Btn>
                    <Btn
                      variant="small"
                      onClick={async () => {
                        await fetchWithCsrf("/api/admin/images", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ profileId: img.id, action: "reject" }),
                        });
                        await loadImages();
                      }}
                    >
                      Reject
                    </Btn>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "readers" && (
          <>
            <SectionHead title="Readers" aside={`${users.length} shown`} />
            <div className="flex flex-wrap gap-2">
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadUsers(userQuery);
                }}
                placeholder="Search username or email"
                className="border border-steel bg-paper px-2 py-1 font-typed text-[13px] text-ink outline-none focus:border-blue"
              />
              <Btn variant="small" onClick={() => void loadUsers(userQuery)}>Search</Btn>
            </div>

            {users.length === 0 ? (
              <Typed className="text-[14px]">No readers match.</Typed>
            ) : (
              users.map((u) => (
                <div key={u.id} className="row-fill flex flex-col gap-2 px-3 py-3 md:grid md:grid-cols-[190px_minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <div className="flex flex-col">
                    <Link href={`/user/${u.username}`} className="text-[15px] underline">{u.username}</Link>
                    <Typed className="text-[11px] text-navy">
                      joined {stamp(u.createdAt)}
                      {u.email ? ` · ${u.email}` : ""}
                    </Typed>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-navy px-1.5 font-typed text-[11px] uppercase">{u.role}</span>
                    {u.effectiveStatus !== "active" && (
                      <span className="border border-ink bg-ink px-1.5 font-typed text-[11px] uppercase text-paper">
                        {STATUS_LABEL[u.effectiveStatus] ?? u.effectiveStatus}
                      </span>
                    )}
                    <Typed className="text-[11px] text-navy">
                      {u._count.comments} notes · {u._count.typings} reads · {u._count.votes} votes
                    </Typed>
                    {u.statusReason && (
                      <Typed className="text-[11px] italic text-navy">“{u.statusReason}”</Typed>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SelectPaper
                      value={u.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        withReason(`Change ${u.username}'s role to ${role}`, async (r) => {
                          await patchUser(u.id, { action: "role", role, reason: r });
                        });
                      }}
                      className="w-[120px]"
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </SelectPaper>

                    {u.effectiveStatus === "active" ? (
                      <>
                        <Btn
                          variant="small"
                          onClick={() =>
                            withReason(`Time out ${u.username}`, async (r) =>
                              patchUser(u.id, {
                                action: "status",
                                status: "timeout",
                                until: 1440,
                                reason: r,
                              })
                            )
                          }
                        >
                          1d timeout
                        </Btn>
                        <Btn
                          variant="small"
                          onClick={() =>
                            withReason(`Ban ${u.username}`, async (r) =>
                              patchUser(u.id, { action: "status", status: "banned", reason: r })
                            )
                          }
                        >
                          Ban
                        </Btn>
                      </>
                    ) : (
                      <Btn
                        variant="small"
                        onClick={() =>
                          withReason(`Restore ${u.username}`, async (r) =>
                            patchUser(u.id, { action: "status", status: "active", reason: r })
                          )
                        }
                      >
                        Restore
                      </Btn>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "audit" && (
          <>
            <SectionHead title="Audit log" aside={`${auditRows.length} shown`} />
            <div className="flex flex-wrap gap-2">
              <SelectPaper
                value={auditFilter}
                onChange={(e) => {
                  setAuditFilter(e.target.value);
                  void loadAudit(e.target.value);
                }}
                className="w-[220px]"
              >
                <option value="">All actions</option>
                {auditActions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </SelectPaper>
              <Btn variant="small" onClick={() => void loadAudit(auditFilter)}>Refresh</Btn>
            </div>

            {auditRows.length === 0 ? (
              <Typed className="text-[14px]">No actions recorded yet.</Typed>
            ) : (
              auditRows.map((row) => (
                <div key={row.id} className="row-fill flex flex-col gap-1 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-typed text-[13px]">
                      <span className="font-bold">{row.actorName ?? "system"}</span>
                      {" · "}
                      <span className="text-blue">{row.action}</span>
                      {" · "}
                      {row.targetLabel ?? row.targetId}
                    </span>
                    <span className="font-typed text-[11px] text-steel-2">{stamp(row.createdAt)}</span>
                  </div>
                  {row.reason && (
                    <Typed className="text-[12px] italic text-navy">“{row.reason}”</Typed>
                  )}
                  {row.before || row.after ? (
                    <Typed className="text-[11px] text-steel-2">
                      {row.before ? `before ${JSON.stringify(row.before)}` : ""}
                      {row.before && row.after ? " → " : ""}
                      {row.after ? `after ${JSON.stringify(row.after)}` : ""}
                    </Typed>
                  ) : null}
                </div>
              ))
            )}
          </>
        )}

        {tab === "maintenance" && (
          <>
            <SectionHead title="Site health" />
            {!maintenance ? (
              <Typed>Checking.</Typed>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <Typed className="text-[14px]">
                    database: <span className="font-typed">{maintenance.health.database}</span>
                  </Typed>
                  <Typed className="text-[14px]">
                    search: <span className="font-typed">{maintenance.health.search}</span>
                  </Typed>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                  {Object.entries(maintenance.counts).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2">
                      <Typed className="text-[12px] text-navy">{k}</Typed>
                      <span className="font-typed text-[14px]">{v}</span>
                    </div>
                  ))}
                </div>

                <SectionHead title="Maintenance actions" size={20} />
                <div className="flex flex-wrap gap-2">
                  {maintenance.actions.map((a) => (
                    <Btn key={a} variant="small" onClick={() => void runMaintenance(a)} disabled={busy}>
                      {a}
                    </Btn>
                  ))}
                </div>
                <Typed className="mt-1 text-[12px] leading-[1.6] text-navy">
                  reindex-search rebuilds the search index; purge-sessions deletes expired session
                  rows; recount-consensus recomputes cached agreement from live votes. Each is safe
                  to run twice and is recorded in the audit log.
                </Typed>
              </>
            )}
          </>
        )}
      </Sheet>

      <Modal open={!!reasonPrompt} onClose={() => setReasonPrompt(null)} title={reasonPrompt?.title ?? ""}>
        <div className="flex flex-col gap-3">
          <Typed className="text-[13px] leading-[1.5]">
            A reason is required. It is shown to the reader and kept in the audit log.
          </Typed>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Repeated stereotyping after a warning."
            className="w-full border border-steel bg-paper px-2 py-1 font-body text-[14px] text-ink outline-none focus:border-blue"
          />
          <div className="flex gap-2">
            <Btn variant="primary" onClick={() => void runReasoned()} disabled={!reason.trim() || busy}>
              Confirm
            </Btn>
            <Btn variant="secondary" onClick={() => setReasonPrompt(null)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
