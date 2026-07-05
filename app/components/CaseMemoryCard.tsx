import Link from "next/link";
import type { PrecedentCase } from "../lib/contract";
import { PrecedentStrengthMeter } from "./PrecedentStrengthMeter";

export function CaseMemoryCard({ precedentCase }: { precedentCase: PrecedentCase }) {
  const c = precedentCase;
  return (
    <Link
      href={`/cases/${c.case_id}`}
      className="folder-spine block bg-charcoal/60 hover:bg-charcoal transition-colors px-5 py-4 rounded-r-sm"
      data-status={
        c.status === "active" ? "active" : c.status === "overturned" ? "disputed" : "archived"
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-gold">{c.case_id}</span>
        <span className="font-mono text-[11px] uppercase text-muted">{c.status}</span>
      </div>
      <p className="font-display text-lg text-paper mt-1">{c.holding}</p>
      <p className="text-xs text-parchment/70 mt-2 line-clamp-2">{c.fact_pattern_summary}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {c.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] font-mono text-parchment/80 border border-line/40 rounded-sm px-1.5 py-0.5"
          >
            #{t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between citation-line pt-2">
        <PrecedentStrengthMeter strength={c.precedent_strength} />
        <span className="font-mono text-[11px] text-muted">
          {c.citation_count} citations · {c.negative_treatment_count} negative
        </span>
      </div>
    </Link>
  );
}
