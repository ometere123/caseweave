import type { Verdict } from "../lib/contract";
import { TreatmentBadge } from "./TreatmentBadge";
import { HoldingPanel } from "./HoldingPanel";

export function VerdictPanel({ verdict }: { verdict: Verdict }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-2xl text-paper">
          {verdict.verdict.replace(/_/g, " ")}
        </span>
        <span className="font-mono text-xs text-muted">
          confidence {verdict.confidence}%
        </span>
        <span className="font-mono text-xs text-citation">
          {verdict.precedent_alignment.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="border border-line/40 rounded-sm p-2">
          <p className="text-muted">Claimant score</p>
          <p className="text-paper text-lg">{verdict.claimant_score}</p>
        </div>
        <div className="border border-line/40 rounded-sm p-2">
          <p className="text-muted">Respondent score</p>
          <p className="text-paper text-lg">{verdict.respondent_score}</p>
        </div>
      </div>

      <HoldingPanel holding={verdict.holding} reasoningRule={verdict.reasoning_rule} />

      <p className="text-sm text-parchment/90 leading-relaxed">
        {verdict.short_reason}
      </p>

      <div className="flex flex-wrap gap-2">
        {verdict.followed_cases.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <TreatmentBadge treatment="followed" /> <span className="font-mono text-xs text-muted">{c}</span>
          </span>
        ))}
        {verdict.distinguished_cases.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <TreatmentBadge treatment="distinguished" /> <span className="font-mono text-xs text-muted">{c}</span>
          </span>
        ))}
        {verdict.weakened_cases.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <TreatmentBadge treatment="weakened" /> <span className="font-mono text-xs text-muted">{c}</span>
          </span>
        ))}
        {verdict.overturned_cases.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <TreatmentBadge treatment="overturned" /> <span className="font-mono text-xs text-muted">{c}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
