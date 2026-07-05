import Link from "next/link";
import type { Agreement } from "../lib/contract";

export function AgreementFolderCard({ agreement }: { agreement: Agreement }) {
  return (
    <Link
      href={`/agreements/${agreement.agreement_id}`}
      className="folder-spine block bg-charcoal/60 hover:bg-charcoal transition-colors px-5 py-4 rounded-r-sm"
      data-status={agreement.status}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg text-paper">{agreement.title}</p>
          <p className="font-mono text-[11px] text-muted mt-1">
            {agreement.agreement_id} · {agreement.agreement_type.replace(/_/g, " ")}
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted px-2 py-1 border border-line/50 rounded-sm">
          {agreement.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {agreement.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-mono text-parchment/80 border border-line/40 rounded-sm px-1.5 py-0.5"
          >
            #{tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-muted citation-line pt-2">
        <span>stake: {agreement.stake_amount} GEN</span>
        <span>policy: {agreement.precedent_policy.replace(/_/g, " ")}</span>
      </div>
    </Link>
  );
}
