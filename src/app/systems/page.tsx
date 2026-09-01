import Link from "next/link";
import { TYPING_SYSTEMS, SYSTEM_COLORS } from "@/lib/typing-systems";

export default function SystemsPage() {
  const isPending = (s: (typeof TYPING_SYSTEMS)[number]) =>
  (!s.types || s.types.length === 0) && (!s.dimensions || s.dimensions.length === 0) && (!s.facets);

  const known = TYPING_SYSTEMS.filter((s) => !isPending(s));
  const pending = TYPING_SYSTEMS.filter((s) => isPending(s));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#e8ecf4]">Typing Systems</h1>
        <p className="text-sm text-[#7888a0] mt-1">
          {known.length} personality typing systems available for voting. Each system is independently rated.
        </p>
      </div>

      {/* Known Systems */}
      <div className="grid grid-cols-1 gap-4">
        {known.map((system) => {
          const colors = SYSTEM_COLORS[system.slug] || "bg-[#1a2234] text-[#7888a0] border-[#2a3a4a]";
          const colorMatch = colors.match(/text-\[([^\]]+)\]/);
          const textColor = colorMatch ? colorMatch[1] : "#7888a0";

          return (
            <div
              key={system.slug}
              className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-[#c8d0dc]">{system.name}</h2>
                  <p className="text-sm text-[#7888a0] mt-0.5">{system.description}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-xs rounded border ${colors}`}>
                  {system.types?.length || 0} types
                </span>
              </div>

              {/* Type chips */}
              <div className="flex flex-wrap gap-1.5">
                {(system.types || []).slice(0, 24).map((type) => (
                  <Link
                    key={type.value}
                    href={`/search?type=${encodeURIComponent(type.value)}&system=${system.slug}`}
                    className="group relative px-2 py-0.5 text-xs rounded bg-[#141c2b] border border-[#1a2234] hover:border-[#64ffda]/40 transition-colors"
                    title={type.description || type.label}
                  >
                    <span className="text-[#7888a0] group-hover:text-[#64ffda] transition-colors">
                      {type.value}
                    </span>
                  </Link>
                ))}
                {(system.types || []).length > 24 && (
                  <span className="px-2 py-0.5 text-xs text-[#4a5a70]">
                    +{(system.types || []).length - 24} more
                  </span>
                )}
              </div>

              {/* Extra info for OPS */}
              {"animals" in system && system.animals && (
                <div className="mt-3 pt-3 border-t border-[#1a2234]">
                  <span className="text-xs text-[#4a5a70] uppercase tracking-wider">Animals: </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(system.animals as { value: string; label: string; description?: string }[]).map((a) => (
                      <span
                        key={a.value}
                        className="px-2 py-0.5 text-xs rounded bg-[#1a2234] text-[#7888a0]"
                        title={a.description || a.label}
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra info for Big Five Facets */}
              {"facets" in system && system.facets && (
                <div className="mt-3 pt-3 border-t border-[#1a2234]">
                  <span className="text-xs text-[#4a5a70] uppercase tracking-wider">Dimensions: </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(system.facets as { dimension: string; facets: { value: string; label: string }[] }[]).map((dim) => (
                      <span
                        key={dim.dimension}
                        className="px-2 py-0.5 text-xs rounded bg-[#1a2234] text-[#7ddfc0]"
                        title={dim.facets.map((f) => f.label).join(", ")}
                      >
                        {dim.dimension} ({dim.facets.length} facets)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra info for Riso-Hudson */}
              {"levels" in system && system.levels && (
                <div className="mt-3 pt-3 border-t border-[#1a2234]">
                  <span className="text-xs text-[#4a5a70] uppercase tracking-wider">9 Levels of Health per type</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending Systems */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#4a5a70] uppercase tracking-wider mb-3">
            Research Pending
          </h2>
          <div className="flex flex-wrap gap-2">
            {pending.map((system) => {
              const colors = SYSTEM_COLORS[system.slug] || "bg-[#1a2234] text-[#4a5a70] border-[#2a3a4a]";
              return (
                <span
                  key={system.slug}
                  className={`px-3 py-1.5 text-sm rounded border ${colors} italic`}
                >
                  {system.name}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}