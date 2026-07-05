import Link from "next/link";
import type { PrecedentSearchResult } from "../lib/contract";

export function PrecedentBench({
  search,
}: {
  search: PrecedentSearchResult | null;
}) {
  if (!search) {
    return (
      <div className="border border-line/40 rounded-sm p-4 text-sm text-muted italic">
        No precedent search has been requested yet. This dispute may create a
        new line of reasoning, or relevant prior cases have not been surfaced.
      </div>
    );
  }

  if (search.relevant_cases.length === 0) {
    return (
      <div className="border border-line/40 rounded-sm p-4 text-sm text-parchment/80">
        <p className="italic mb-2">
          This dispute may create a new line of reasoning. Validators will
          decide without a close prior case.
        </p>
        <p className="text-xs text-muted">{search.search_summary}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{search.search_summary}</p>
      {search.relevant_cases.map((c) => (
        <Link
          key={c.case_id}
          href={`/cases/${c.case_id}`}
          className="block border border-line/40 rounded-sm p-3 hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-gold">{c.case_id}</span>
            <span className="font-mono text-xs text-muted">
              similarity {c.similarity_score}%
            </span>
          </div>
          <p className="text-sm text-paper mt-1">{c.shared_issue}</p>
          <p className="text-xs text-dispute/80 mt-1">risk: {c.risk}</p>
        </Link>
      ))}
    </div>
  );
}
