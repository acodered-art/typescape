"use client";
import { useMemo } from "react";

/**
 * Radar / parallel view of the 12-axis trait survey.
 *
 * Rendered as an <svg> in the Dossier palette (blue = the primary vector,
 * steel = the comparison vector, navy hairlines for the reference rings).
 * Pure presentation: it takes already-averaged values and draws them.
 */

export interface RadarAxis {
  slug: string;
  name: string;
  lowLabel: string;
  highLabel: string;
}

export interface RadarSeries {
  label: string;
  /** Values in the same order as `axes`, each -3..+3. */
  values: number[];
  tone: "blue" | "steel";
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 46;

/** -3..+3 maps to 0..1 of the radius (0 is the centre). */
function normalise(value: number): number {
  return (Math.max(-3, Math.min(3, value)) + 3) / 6;
}

function pointAt(index: number, total: number, radius: number): [number, number] {
  // Start at the top and go clockwise.
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function polygon(values: number[], axes: RadarAxis[], scale = 1): string {
  return values
    .map((v, i) => {
      const [x, y] = pointAt(i, axes.length, RADIUS * normalise(v) * scale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const strokeFor = (tone: RadarSeries["tone"]) => (tone === "blue" ? "stroke-blue" : "stroke-steel");
const fillFor = (tone: RadarSeries["tone"]) => (tone === "blue" ? "fill-blue" : "fill-steel");

export function TraitRadar({
  axes,
  series,
  caption,
}: {
  axes: RadarAxis[];
  series: RadarSeries[];
  caption?: string;
}) {
  const rings = useMemo(() => [0.25, 0.5, 0.75, 1], []);

  if (axes.length < 3) return null;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        className="block max-w-[420px]"
        role="img"
        aria-label={
          caption ??
          `Trait radar chart across ${axes.length} axes: ${series.map((s) => s.label).join(", ")}.`
        }
      >
        {/* reference rings and spokes */}
        <g className="stroke-navy" fill="none" strokeWidth="1" strokeOpacity="0.25">
          {rings.map((r) => (
            <circle key={r} cx={CENTER} cy={CENTER} r={RADIUS * r} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pointAt(i, axes.length, RADIUS);
            return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} />;
          })}
          {/* the zero line: values are -3..+3, so the centre is 0 */}
          <circle cx={CENTER} cy={CENTER} r="2.5" className="fill-navy" stroke="none" />
        </g>

        {series.map((s) => (
          <g key={s.label}>
            <polygon
              points={polygon(s.values, axes)}
              className={`${fillFor(s.tone)} ${strokeFor(s.tone)}`}
              fillOpacity="0.14"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => {
              const [x, y] = pointAt(i, axes.length, RADIUS * normalise(v));
              return <circle key={i} cx={x} cy={y} r="2.6" className={fillFor(s.tone)} />;
            })}
          </g>
        ))}

        {/* axis labels, short forms, outside the outer ring */}
        <g fontWeight="700" fontSize="9" letterSpacing="0.9" style={{ fontFamily: "var(--font-display)" }}>
          {axes.map((a, i) => {
            const [x, y] = pointAt(i, axes.length, RADIUS + 20);
            const anchor = x < CENTER - 6 ? "end" : x > CENTER + 6 ? "start" : "middle";
            return (
              <text key={a.slug} x={x} y={y + 3} textAnchor={anchor} className="fill-ink">
                {a.name.toUpperCase()}
              </text>
            );
          })}
        </g>
      </svg>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-typed text-sm">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 border ${strokeFor(s.tone)} ${fillFor(s.tone)}`} style={{ opacity: 0.7 }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * Side-by-side per-axis diff between two vectors. Each row shows the axis, the
 * two values, and a bar for the gap so the divergence is visible at a glance.
 */
export function TraitDiff({
  axes,
  a,
  b,
  aLabel,
  bLabel,
}: {
  axes: RadarAxis[];
  a: number[];
  b: number[];
  aLabel: string;
  bLabel: string;
}) {
  const rows = axes.map((axis, i) => ({
    axis,
    a: a[i] ?? 0,
    b: b[i] ?? 0,
    delta: Math.round(((a[i] ?? 0) - (b[i] ?? 0)) * 100) / 100,
  }));

  const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  // The widest possible gap is 6 (-3 to +3).
  const gapWidth = (d: number) => `${Math.min(100, (Math.abs(d) / 6) * 100)}%`;

  return (
    <table className="w-full font-typed text-sm">
      <caption className="sr-only">
        Per-axis difference between {aLabel} and {bLabel}
      </caption>
      <thead>
        <tr className="border-b border-ink text-left">
          <th scope="col" className="py-1 font-display text-base uppercase tracking-[0.1em]">Trait</th>
          <th scope="col" className="py-1 text-right">{aLabel}</th>
          <th scope="col" className="py-1 text-right">{bLabel}</th>
          <th scope="col" className="py-1">Gap</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ axis, a: av, b: bv, delta }) => (
          <tr key={axis.slug} className="border-b border-steel/40">
            <th scope="row" className="py-1 pr-2 text-left font-body text-base font-normal" title={`${axis.lowLabel} to ${axis.highLabel}`}>
              {axis.name}
            </th>
            <td className="py-1 text-right">{signed(av)}</td>
            <td className="py-1 text-right">{signed(bv)}</td>
            <td className="w-[38%] py-1 pl-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 flex-1 bg-paper-2">
                  <span
                    className={`block h-1.5 ${Math.abs(delta) >= 2 ? "bg-blue" : "bg-steel"}`}
                    style={{ width: gapWidth(delta) }}
                  />
                </span>
                <span className="w-[34px] text-right text-xs text-navy">{signed(delta)}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
