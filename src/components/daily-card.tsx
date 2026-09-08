"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Btn, Portrait, Section, SectionHead, Sheet, Typed } from "@/components/dossier";

/** Today's character: one file, the same for everyone until midnight UTC. */
interface DailyResponse {
  date: string;
  day: number;
  nextRollover: string;
  character: {
    slug: string;
    name: string;
    imageUrl: string | null;
    description: string | null;
    viewCount: number;
    category: { name: string; slug: string } | null;
    readings: { system: string; systemName: string; type: string; votes: number }[];
  };
}

export function DailyCard() {
  const [data, setData] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Section>
        <SectionHead title="Today's character" aside="Drawing a file" />
      </Section>
    );
  }
  if (!data) return null;

  const c = data.character;

  return (
    <Section>
      <SectionHead title="Today's character" aside={data.date} />
      <Sheet className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <Portrait src={c.imageUrl} alt={c.name} w={84} h={102} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Link
            href={`/profiles/${c.slug}`}
            className="font-display text-[30px] font-extrabold uppercase leading-none hover:text-navy"
          >
            {c.name}
          </Link>
          {c.category && (
            <Typed className="text-[12px] uppercase tracking-[0.14em] text-navy">
              {c.category.name}
            </Typed>
          )}
          {c.description && (
            <Typed className="text-[14px] leading-[1.5]">{c.description}</Typed>
          )}
          {c.readings.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {c.readings.slice(0, 4).map((r) => (
                <span
                  key={`${r.system}-${r.type}`}
                  className="border border-steel px-2 py-0.5 font-typed text-[12px]"
                  title={`${r.votes} ${r.votes === 1 ? "vote" : "votes"}`}
                >
                  {r.type}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-3">
            <Btn href={`/profiles/${c.slug}`} variant="primary">
              Open the file
            </Btn>
            <Typed className="text-[11px] text-steel-2">
              Changes at midnight UTC
            </Typed>
          </div>
        </div>
      </Sheet>
    </Section>
  );
}
