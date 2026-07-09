"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "../../../lib/genlayer";
import type { PrecedentCase, CaseTreatment } from "../../../lib/contract";
import { PrecedentStrengthMeter } from "../../../components/PrecedentStrengthMeter";
import { TreatmentBadge } from "../../../components/TreatmentBadge";
import { HoldingPanel } from "../../../components/HoldingPanel";
import { CitationGraph } from "../../../components/CitationGraph";

type PrecedentGraph = {
  outgoing_treatments: CaseTreatment[];
  incoming_treatments: CaseTreatment[];
};

export function CaseMemoryClient({ caseId }: { caseId: string }) {
  const [precedentCase, setPrecedentCase] = useState<PrecedentCase | null>(null);
  const [graph, setGraph] = useState<PrecedentGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      readContract("get_precedent_case", [caseId]),
      readContract("get_precedent_graph", [caseId]),
    ])
      .then(([c, g]) => {
        setPrecedentCase(c as PrecedentCase);
        setGraph(g as PrecedentGraph);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load case"));
  }, [caseId]);

  if (error) return <div className="max-w-4xl mx-auto px-6 py-14 text-dispute">{error}</div>;
  if (!precedentCase) return <div className="max-w-4xl mx-auto px-6 py-14 text-muted">Loading case…</div>;

  const overturned = precedentCase.status === "overturned";

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        Case Memory
      </p>
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <h1 className="font-display text-3xl text-paper">{precedentCase.case_id}</h1>
        <span className="font-mono text-xs uppercase text-muted border border-line/50 rounded-sm px-2 py-1">
          {precedentCase.status}
        </span>
      </div>
      <p className="font-mono text-xs text-muted mb-6">
        {precedentCase.agreement_type.replace(/_/g, " ")} · outcome: {precedentCase.outcome.replace(/_/g, " ")}
        {" · "}
        {new Date(precedentCase.created_at).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>

      {overturned && (
        <div className="border border-dispute/50 bg-dispute/10 rounded-sm p-4 mb-6 text-sm text-dispute">
          This precedent has been overturned. It remains visible for historical
          context but should not guide future outcomes unless cited for
          background.
        </div>
      )}

      <PrecedentStrengthMeter strength={precedentCase.precedent_strength} />

      <div className="mt-8 space-y-6">
        <Section title="Fact Pattern">
          <p className="text-sm text-parchment/90 leading-relaxed">
            {precedentCase.fact_pattern_summary}
          </p>
        </Section>

        <Section title="Issue">
          <p className="text-sm text-parchment/90 leading-relaxed italic">
            {precedentCase.legal_issue}
          </p>
        </Section>

        <HoldingPanel
          holding={precedentCase.holding}
          reasoningRule={precedentCase.reasoning_rule}
        />

        <Section title="Treatment History">
          {graph && graph.incoming_treatments.length > 0 ? (
            <div className="space-y-2">
              {graph.incoming_treatments.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <TreatmentBadge treatment={t.treatment} />
                  <span className="text-parchment/80">
                    by{" "}
                    <Link href={`/cases/${t.new_case_id}`} className="text-citation hover:underline">
                      {t.new_case_id}
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted italic">
              No later case has treated this precedent yet.
            </p>
          )}
        </Section>

        <Section title="Citation Graph">
          {graph && (
            <CitationGraph
              centerId={precedentCase.case_id}
              outgoing={graph.outgoing_treatments}
              incoming={graph.incoming_treatments}
            />
          )}
        </Section>

        <div className="flex flex-wrap gap-2">
          {precedentCase.tags.map((t) => (
            <span key={t} className="text-[10px] font-mono text-parchment/80 border border-line/40 rounded-sm px-1.5 py-0.5">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">{title}</p>
      {children}
    </div>
  );
}
