"use client";
import { useState } from "react";
import { CORRELATIONS, getCorrelations, type Correlation } from "@/lib/correlations";
import { Section, SectionHead, Sheet, Typed } from "@/components/dossier";

/**
 * Correlation explorer — MBTI / Enneagram / Big Five as a chord diagram.
 *
 * The diagram answers "how do the systems line up?" at a glance; the panel
 * beside it lists the exact links for one pick. Everything is derived from
 * `CORRELATIONS`, so adding a correlation updates this automatically.
 */

const SYSTEM_LABELS: Record<string, string> = {
  mbti: "MBTI",
  enneagram: "Enneagram",
  "big-five": "Big Five",
};

const SYSTEM_NAMES: Record<string, string[]> = {
  mbti: ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"],
  enneagram: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  "big-five": ["O", "C", "E", "A", "N"],
};

const SIZE = 460;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 96;

type Node = { key: string; system: string; type: string; angle: number; x: number; y: number };

/** Lay each system's types out in its own arc, systems spread evenly. */
function layout(): { nodes: Node[]; byKey: Map<string, Node> } {
  const systems = Object.keys(SYSTEM_NAMES);
  const total = systems.reduce((sum, s) => sum + SYSTEM_NAMES[s].length, 0);
  const nodes: Node[] = [];
  let cursor = 0;

  systems.forEach((system, si) => {
    const types = SYSTEM_NAMES[system];
    // A gutter between systems so the arcs read as groups.
    cursor += 0.6;
    types.forEach((type) => {
      const angle = ((cursor + 0.5) / (total + systems.length * 0.6)) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        key: `${system}:${type}`,
        system,
        type,
        angle,
        x: CENTER + RADIUS * Math.cos(angle),
        y: CENTER + RADIUS * Math.sin(angle),
      });
      cursor += 1;
    });
    void si;
  });

  return { nodes, byKey: new Map(nodes.map((n) => [n.key, n])) };
}

const SYSTEM_TONE: Record<string, string> = {
  mbti: "#158fd4", // blue
  enneagram: "#9daecc", // steel
  "big-five": "#4f6f94", // steel-2
};

// The layout and the chord geometry are static data, so they are computed once
// at module scope rather than memoized inside the component.
const { nodes, byKey } = layout();

interface Arc {
  id: number;
  d: string;
  strength: number;
  tone: string;
  a: string;
  b: string;
  description: string;
}

const ARCS: Arc[] = CORRELATIONS.flatMap((c, i) => {
  const a = byKey.get(`${c.sourceSystem}:${c.sourceType}`);
  const b = byKey.get(`${c.targetSystem}:${c.targetType}`);
  if (!a || !b) return [];
  // A quadratic curve bulging toward the centre keeps the chords readable.
  const mx = CENTER + ((a.x + b.x) / 2 - CENTER) * 0.35;
  const my = CENTER + ((a.y + b.y) / 2 - CENTER) * 0.35;
  return [{
    id: i,
    d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
    strength: c.strength,
    tone: SYSTEM_TONE[c.sourceSystem] ?? "#158fd4",
    a: `${c.sourceSystem}:${c.sourceType}`,
    b: `${c.targetSystem}:${c.targetType}`,
    description: c.description,
  }];
});

export function CorrelationExplorer() {
  const [selected, setSelected] = useState<string | null>(null);
  const arcs = ARCS;

  const activeArcs = selected
    ? arcs.filter((arc) => arc.a === selected || arc.b === selected)
    : [];

  const [selSystem, selType] = selected?.split(":") ?? [];
  const related: Correlation[] = selected ? getCorrelations(selSystem, selType) : [];

  // Arc thickness: strongest link reads ~5px, weakest ~1px.
  const width = (strength: number) => 1 + strength * 8;

  return (
    <Section className="grid gap-7 md:grid-cols-[440px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="border border-ink">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width="100%"
            className="block"
            role="img"
            aria-label={`Correlation map across ${Object.keys(SYSTEM_NAMES).length} typing systems, ${CORRELATIONS.length} known links.`}
          >
            {/* chords, drawn under the nodes */}
            <g fill="none">
              {arcs.map((arc) => {
                const isActive = activeArcs.includes(arc);
                return (
                  <path
                    key={arc.id}
                    d={arc.d}
                    stroke={arc.tone}
                    strokeWidth={width(arc.strength)}
                    strokeOpacity={selected ? (isActive ? 0.85 : 0.08) : 0.28}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>

            {/* node dots + labels */}
            <g>
              {nodes.map((n) => {
                const isSel = selected === n.key;
                const onArc = activeArcs.some((a) => a.a === n.key || a.b === n.key);
                const labelX = CENTER + (RADIUS + 22) * Math.cos(n.angle);
                const labelY = CENTER + (RADIUS + 22) * Math.sin(n.angle);
                const anchor = labelX < CENTER - 6 ? "end" : labelX > CENTER + 6 ? "start" : "middle";
                return (
                  <g key={n.key}>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={isSel ? 8 : 4.5}
                      fill={SYSTEM_TONE[n.system]}
                      opacity={selected && !onArc && !isSel ? 0.3 : 1}
                    />
                    <text
                      x={labelX}
                      y={labelY + 3}
                      textAnchor={anchor}
                      fontSize="10"
                      fontWeight="700"
                      letterSpacing="0.6"
                      className={isSel || onArc ? "fill-ink" : "fill-navy"}
                      style={{ fontFamily: "var(--font-typed)", cursor: "pointer" }}
                      onClick={() => setSelected(isSel ? null : n.key)}
                    >
                      {n.type}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        <Typed className="text-[12px]">
          Line thickness is the strength of the link. {CORRELATIONS.length} known correlations
          across {Object.keys(SYSTEM_NAMES).length} systems.
        </Typed>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {nodes.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setSelected(selected === n.key ? null : n.key)}
              className={`border px-2 py-0.5 font-typed text-[12px] ${
                selected === n.key ? "border-blue bg-blue text-ink" : "border-steel hover:border-navy hover:bg-paper-2"
              }`}
            >
              {SYSTEM_LABELS[n.system]} {n.type}
            </button>
          ))}
        </div>

        {selected ? (
          <Sheet className="p-4">
            <SectionHead title={`${SYSTEM_LABELS[selSystem]} ${selType}`} size={20} />
            {related.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2">
                {related
                  .slice()
                  .sort((a, b) => b.strength - a.strength)
                  .map((c) => (
                    <div key={`${c.targetSystem}-${c.targetType}`} className="flex items-start justify-between gap-3 text-[14px]">
                      <span>
                        <span className="font-typed font-bold">{SYSTEM_LABELS[c.targetSystem] ?? c.targetSystem} {c.targetType}</span>
                        {" — "}
                        {c.description}
                      </span>
                      <span className="shrink-0 font-typed text-[12px] text-navy">{Math.round(c.strength * 100)}%</span>
                    </div>
                  ))}
              </div>
            ) : (
              <Typed className="mt-2">No correlations recorded for this type yet.</Typed>
            )}
          </Sheet>
        ) : (
          <Sheet className="p-4">
            <Typed>
              Pick a type to see what it correlates with. The map shows every link at once;
              the list shows the exact matches for one pick.
            </Typed>
          </Sheet>
        )}
      </div>
    </Section>
  );
}
