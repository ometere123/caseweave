import type { Agreement, Dispute } from "../lib/contract";

type Step = { label: string; done: boolean };

function disputeSteps(dispute: Dispute): Step[] {
  const order = [
    "awaiting_response",
    "awaiting_precedent_search",
    "awaiting_verdict",
    "verdict_reached",
    "finalized",
  ];
  const idx = order.indexOf(dispute.status);
  return [
    { label: "Dispute filed", done: true },
    { label: "Response submitted", done: idx >= 1 },
    { label: "Precedent search requested", done: idx >= 2 || !!dispute.precedent_search },
    { label: "Verdict reached", done: idx >= 3 || !!dispute.verdict },
    { label: "Precedent finalized", done: idx >= 4 || !!dispute.final_case_id },
  ];
}

export function CaseTimeline({
  agreement,
  disputes,
}: {
  agreement: Agreement;
  disputes: Dispute[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-verdict" />
        <span className="text-sm text-parchment/90">Agreement created</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            agreement.status === "pending_acceptance" ? "bg-muted" : "bg-verdict"
          }`}
        />
        <span className="text-sm text-parchment/90">
          {agreement.status === "pending_acceptance"
            ? "Awaiting counterparty acceptance"
            : "Accepted by counterparty"}
        </span>
      </div>

      {disputes.map((d) => (
        <div key={d.dispute_id} className="pl-4 border-l border-line/40 space-y-2">
          <p className="font-mono text-xs text-gold">{d.dispute_id}</p>
          {disputeSteps(d).map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  step.done ? "bg-citation" : "bg-line/50"
                }`}
              />
              <span
                className={`text-xs ${
                  step.done ? "text-parchment/90" : "text-muted italic"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      ))}

      {disputes.length === 0 && (
        <p className="text-xs text-muted italic pl-4">No disputes filed yet.</p>
      )}
    </div>
  );
}
