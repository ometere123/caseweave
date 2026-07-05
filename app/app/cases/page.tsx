"use client";

import { useEffect, useState } from "react";
import { readContract } from "../../lib/genlayer";
import type { PrecedentCase } from "../../lib/contract";
import { CaseMemoryCard } from "../../components/CaseMemoryCard";

type SortKey = "recent" | "cited" | "foundational" | "controversial" | "weakened" | "distinguished";

const STATUS_OPTIONS = ["active", "weakened", "overturned", "limited", "archived"];
const OUTCOME_OPTIONS = [
  "claimant_wins",
  "respondent_wins",
  "partial_release",
  "refund",
  "revision_required",
  "no_breach",
  "mutual_fault",
  "insufficient_evidence",
  "bad_faith_claim",
  "settlement_recommended",
  "escalate_to_human",
];

export default function PrecedentLibraryPage() {
  const [cases, setCases] = useState<Record<string, PrecedentCase> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [typeFilter, setTypeFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [minStrength, setMinStrength] = useState(0);
  const [citedOftenOnly, setCitedOftenOnly] = useState(false);

  useEffect(() => {
    readContract("list_recent_precedents", [500])
      .then((res) => setCases(res as Record<string, PrecedentCase>))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  let entries = cases ? Object.values(cases) : [];
  if (typeFilter) entries = entries.filter((c) => c.agreement_type === typeFilter);
  if (outcomeFilter) entries = entries.filter((c) => c.outcome === outcomeFilter);
  if (statusFilter) entries = entries.filter((c) => c.status === statusFilter);
  if (tagFilter)
    entries = entries.filter((c) =>
      c.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))
    );
  if (minStrength > 0) entries = entries.filter((c) => c.precedent_strength >= minStrength);
  if (citedOftenOnly) entries = entries.filter((c) => c.citation_count > 0);

  entries = [...entries].sort((a, b) => {
    switch (sort) {
      case "cited":
        return b.citation_count - a.citation_count;
      case "foundational":
        return b.precedent_strength - a.precedent_strength;
      case "controversial":
        return b.negative_treatment_count - a.negative_treatment_count;
      case "weakened":
        return (b.status === "weakened" ? 1 : 0) - (a.status === "weakened" ? 1 : 0);
      case "distinguished":
        return b.negative_treatment_count - a.negative_treatment_count;
      default:
        return b.case_id.localeCompare(a.case_id, undefined, { numeric: true });
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        Precedent Library
      </p>
      <h1 className="font-display text-3xl text-paper mb-8">Case Memory Archive</h1>

      <div className="flex flex-wrap gap-3 mb-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        >
          <option value="recent">Recently created</option>
          <option value="cited">Most cited</option>
          <option value="foundational">Most foundational</option>
          <option value="controversial">Most controversial</option>
          <option value="weakened">Recently weakened</option>
          <option value="distinguished">Most distinguished</option>
        </select>
        <input
          placeholder="Filter by agreement type…"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        >
          <option value="">All verdicts</option>
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        >
          <option value="">All treatment statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter by tag…"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <label className="flex items-center gap-2 text-xs font-mono text-muted">
          min strength
          <input
            type="range"
            min={0}
            max={100}
            value={minStrength}
            onChange={(e) => setMinStrength(Number(e.target.value))}
          />
          <span className="text-paper w-8">{minStrength}</span>
        </label>
        <label className="flex items-center gap-2 text-xs font-mono text-muted">
          <input
            type="checkbox"
            checked={citedOftenOnly}
            onChange={(e) => setCitedOftenOnly(e.target.checked)}
          />
          cited often only
        </label>
      </div>

      {error && <p className="text-dispute text-sm">{error}</p>}
      {cases === null && !error && <p className="text-muted text-sm">Loading archive…</p>}
      {cases !== null && entries.length === 0 && (
        <p className="text-muted text-sm italic">
          No precedent exists yet. The first final verdict will become the
          first rule in this memory layer.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {entries.map((c) => (
          <CaseMemoryCard key={c.case_id} precedentCase={c} />
        ))}
      </div>
    </div>
  );
}
