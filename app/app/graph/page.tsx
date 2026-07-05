"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "../../lib/genlayer";
import type { PrecedentCase, CaseTreatment } from "../../lib/contract";
import { TreatmentBadge } from "../../components/TreatmentBadge";

type NodeStatusFilter = "all" | "active" | "overturned";

export default function PrecedentGraphPage() {
  const [cases, setCases] = useState<Record<string, PrecedentCase> | null>(null);
  const [treatments, setTreatments] = useState<CaseTreatment[]>([]);
  const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [highlightFoundational, setHighlightFoundational] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readContract("list_recent_precedents", [500])
      .then(async (res) => {
        const map = res as Record<string, PrecedentCase>;
        setCases(map);
        const allTreatments = await Promise.all(
          Object.keys(map).map((id) => readContract("get_case_treatments", [id]))
        );
        setTreatments(allTreatments.flat() as CaseTreatment[]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load graph"));
  }, []);

  let entries = cases ? Object.values(cases) : [];
  if (statusFilter === "active") entries = entries.filter((c) => c.status === "active");
  if (statusFilter === "overturned") entries = entries.filter((c) => c.status === "overturned");
  if (typeFilter) entries = entries.filter((c) => c.agreement_type === typeFilter);
  if (tagFilter)
    entries = entries.filter((c) =>
      c.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))
    );
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(
      (c) =>
        c.case_id.toLowerCase().includes(q) ||
        c.holding.toLowerCase().includes(q) ||
        c.legal_issue.toLowerCase().includes(q)
    );
  }

  const width = 900;
  const height = 560;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 80;

  const positioned = entries.map((c, i) => {
    const angle = (2 * Math.PI * i) / Math.max(entries.length, 1);
    return {
      ...c,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  const posById = new Map(positioned.map((p) => [p.case_id, p]));
  const visibleIds = new Set(positioned.map((p) => p.case_id));

  const selectedCase = selected ? cases?.[selected] : null;
  const selectedTreatments = selected
    ? treatments.filter((t) => t.new_case_id === selected || t.old_case_id === selected)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        Precedent Graph
      </p>
      <h1 className="font-display text-3xl text-paper mb-6">Living Case Memory Map</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NodeStatusFilter)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        >
          <option value="all">All cases</option>
          <option value="active">Active only</option>
          <option value="overturned">Overturned lineage</option>
        </select>
        <input
          placeholder="Filter by agreement type…"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
        <input
          placeholder="Filter by issue tag…"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
        <input
          placeholder="Search case ID or phrase…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-charcoal border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
        <label className="flex items-center gap-2 text-xs font-mono text-muted px-1">
          <input
            type="checkbox"
            checked={highlightFoundational}
            onChange={(e) => setHighlightFoundational(e.target.checked)}
          />
          highlight foundational rules
        </label>
      </div>

      {error && <p className="text-dispute text-sm">{error}</p>}

      {cases !== null && entries.length === 0 && (
        <p className="text-muted text-sm italic">
          No precedent exists yet. The first final verdict will become the
          first rule in this memory layer.
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 border border-line/40 rounded-sm bg-charcoal/30 p-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {treatments
              .filter((t) => visibleIds.has(t.new_case_id) && visibleIds.has(t.old_case_id))
              .map((t, i) => {
                const a = posById.get(t.new_case_id);
                const b = posById.get(t.old_case_id);
                if (!a || !b) return null;
                const color =
                  t.treatment === "overturned"
                    ? "var(--dispute-red)"
                    : t.treatment === "weakened"
                    ? "var(--case-gold)"
                    : t.treatment === "distinguished"
                    ? "var(--citation-blue)"
                    : "var(--verdict-green)";
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.5}
                  />
                );
              })}
            {positioned.map((c) => {
              const size = 14 + Math.min(20, c.citation_count * 3 + c.precedent_strength / 10);
              const isFoundational = c.precedent_strength >= 81;
              const borderColor =
                c.status === "overturned"
                  ? "var(--dispute-red)"
                  : c.status === "weakened"
                  ? "var(--case-gold)"
                  : c.status === "limited"
                  ? "var(--citation-blue)"
                  : "var(--verdict-green)";
              return (
                <g
                  key={c.case_id}
                  onClick={() => setSelected(c.case_id)}
                  className="cursor-pointer"
                >
                  {highlightFoundational && isFoundational && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={size + 6}
                      fill="none"
                      stroke="var(--case-gold)"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                      opacity={0.9}
                    />
                  )}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={size}
                    fill="var(--archive-charcoal)"
                    stroke={borderColor}
                    strokeWidth={selected === c.case_id ? 3 : 1.5}
                    opacity={highlightFoundational && !isFoundational ? 0.35 : 1}
                  />
                  <text
                    x={c.x}
                    y={c.y + 3}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                    fill="var(--legal-paper)"
                  >
                    {c.case_id.replace("CASE_", "#")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="border border-line/40 rounded-sm p-4">
          {!selectedCase && (
            <p className="text-sm text-muted italic">
              Click a node to inspect its holding, treatment history, and status.
            </p>
          )}
          {selectedCase && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-gold">{selectedCase.case_id}</span>
                <span className="font-mono text-[11px] uppercase text-muted">
                  {selectedCase.status}
                </span>
              </div>
              <p className="font-display text-paper leading-relaxed">
                {selectedCase.holding}
              </p>
              <p className="text-xs text-muted">
                outcome: {selectedCase.outcome.replace(/_/g, " ")} · strength:{" "}
                {selectedCase.precedent_strength}
              </p>
              <div className="space-y-2">
                {selectedTreatments.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <TreatmentBadge treatment={t.treatment} />
                    <span className="text-parchment/70">
                      {t.new_case_id} ↔ {t.old_case_id}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href={`/cases/${selectedCase.case_id}`}
                className="inline-block bg-gold text-ink font-mono text-xs px-4 py-2 rounded-sm hover:opacity-90"
              >
                Open Case
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
