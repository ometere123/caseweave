"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { readContract, writeContract } from "../../../lib/genlayer";
import { useWallet } from "../../../store/useWallet";
import type { Agreement, Dispute } from "../../../lib/contract";
import { ALLOWED_REQUESTED_OUTCOMES } from "../../../lib/contract";
import { ObligationLens } from "../../../components/ObligationLens";
import { AgreementTextViewer } from "../../../components/AgreementTextViewer";
import { CaseTimeline } from "../../../components/CaseTimeline";

export function AgreementChamberClient({ agreementId }: { agreementId: string }) {
  const { address, connect } = useWallet();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [disputes, setDisputes] = useState<Record<string, Dispute>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ag, disp] = await Promise.all([
        readContract("get_agreement", [agreementId]),
        readContract("list_disputes_by_agreement", [agreementId]),
      ]);
      setAgreement(ag as Agreement);
      setDisputes(disp as Record<string, Dispute>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agreement");
    }
  }, [agreementId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function handleAccept() {
    if (!address) return connect();
    setBusy(true);
    setError(null);
    try {
      await writeContract(address, "accept_agreement", [agreementId]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept agreement");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="max-w-5xl mx-auto px-6 py-14 text-dispute">{error}</div>;
  if (!agreement) return <div className="max-w-5xl mx-auto px-6 py-14 text-muted">Loading…</div>;

  const isCounterparty =
    address && address.toLowerCase() === agreement.counterparty.toLowerCase();
  const isParty =
    address &&
    (address.toLowerCase() === agreement.creator.toLowerCase() ||
      address.toLowerCase() === agreement.counterparty.toLowerCase());
  const disputeEntries = Object.values(disputes);
  const relatedCases = disputeEntries
    .filter((d) => d.final_case_id)
    .map((d) => d.final_case_id);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        {agreement.agreement_id} · {agreement.agreement_type.replace(/_/g, " ")}
      </p>
      <h1 className="font-display text-3xl text-paper mb-8">{agreement.title}</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Panel title="Agreement Text">
            <AgreementTextViewer text={agreement.agreement_text} />
          </Panel>
          <Panel title="Parties">
            <p className="text-xs font-mono text-muted">Creator</p>
            <p className="text-xs font-mono text-paper break-all mb-2">{agreement.creator}</p>
            <p className="text-xs font-mono text-muted">Counterparty</p>
            <p className="text-xs font-mono text-paper break-all">{agreement.counterparty}</p>
          </Panel>
          <ObligationLens agreementText={agreement.agreement_text} />
        </div>

        <div className="md:col-span-1 space-y-4">
          <Panel title="Timeline">
            <CaseTimeline agreement={agreement} disputes={disputeEntries} />
          </Panel>

          <Panel title="Disputes">
            {disputeEntries.length === 0 && (
              <p className="text-sm text-muted italic">No disputes filed yet.</p>
            )}
            <div className="space-y-2">
              {disputeEntries.map((d) => (
                <Link
                  key={d.dispute_id}
                  href={`/disputes/${d.dispute_id}`}
                  className="block border border-line/40 rounded-sm p-3 hover:border-gold/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-gold">{d.dispute_id}</span>
                    <span className="font-mono text-[11px] text-muted uppercase">
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-parchment/80 mt-1 line-clamp-2">
                    {d.claim_summary}
                  </p>
                  {d.final_case_id && (
                    <p className="text-[11px] font-mono text-verdict mt-1">
                      → precedent {d.final_case_id}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Status">
            <p className="font-mono text-sm text-paper uppercase">
              {agreement.status.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-muted mt-2">
              stake: {agreement.stake_amount} GEN
            </p>
            <p className="text-xs text-muted">
              policy: {agreement.precedent_policy.replace(/_/g, " ")}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {agreement.tags.map((t) => (
                <span key={t} className="text-[10px] font-mono text-parchment/80 border border-line/40 rounded-sm px-1.5 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Related Cases">
            {relatedCases.length === 0 ? (
              <p className="text-sm text-muted italic">
                No precedent has been created from this agreement yet.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedCases.map((caseId) => (
                  <Link
                    key={caseId}
                    href={`/cases/${caseId}`}
                    className="block font-mono text-sm text-gold hover:underline"
                  >
                    {caseId}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {agreement.status === "pending_acceptance" && isCounterparty && (
            <button
              onClick={handleAccept}
              disabled={busy}
              className="w-full bg-verdict text-ink font-mono text-sm px-4 py-2.5 rounded-sm hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Accepting…" : "Accept Agreement"}
            </button>
          )}

          {(agreement.status === "active" || agreement.status === "disputed") && isParty && (
            <button
              onClick={() => setShowDisputeForm((v) => !v)}
              className="w-full border border-dispute/60 text-dispute font-mono text-sm px-4 py-2.5 rounded-sm hover:bg-dispute/10"
            >
              {showDisputeForm ? "Cancel" : "File Dispute"}
            </button>
          )}

          {showDisputeForm && (
            <FileDisputeForm
              agreementId={agreementId}
              onFiled={() => {
                setShowDisputeForm(false);
                load();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line/40 rounded-sm p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">{title}</p>
      {children}
    </div>
  );
}

function FileDisputeForm({
  agreementId,
  onFiled,
}: {
  agreementId: string;
  onFiled: () => void;
}) {
  const { address, connect } = useWallet();
  const [claimSummary, setClaimSummary] = useState("");
  const [breachReason, setBreachReason] = useState("");
  const [similarPrecedent, setSimilarPrecedent] = useState("");
  const [requestedOutcome, setRequestedOutcome] = useState<string>(
    ALLOWED_REQUESTED_OUTCOMES[0]
  );
  const [evidence, setEvidence] = useState("");
  const [bondConfirmed, setBondConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return connect();
    if (!bondConfirmed) {
      setError("Confirm the bond acknowledgement before filing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const evidenceUrls = evidence
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const fullClaim = [
        claimSummary,
        breachReason && `Why this is a breach: ${breachReason}`,
        similarPrecedent && `Similar precedent cited by claimant: ${similarPrecedent}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await writeContract(address, "file_dispute", [
        agreementId,
        fullClaim,
        requestedOutcome,
        evidenceUrls,
      ]);
      onFiled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to file dispute");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-dispute/40 bg-dispute/5 rounded-sm p-4 space-y-3">
      <p className="text-[11px] text-dispute italic">
        Weak evidence may lead to insufficient evidence or bad-faith claim
        findings.
      </p>

      <Field label="Claim">
        <textarea
          required
          rows={3}
          placeholder="What happened?"
          value={claimSummary}
          onChange={(e) => setClaimSummary(e.target.value)}
          className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper"
        />
      </Field>

      <Field label="Requested outcome">
        <select
          value={requestedOutcome}
          onChange={(e) => setRequestedOutcome(e.target.value)}
          className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        >
          {ALLOWED_REQUESTED_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Evidence">
        <textarea
          rows={3}
          placeholder={"Evidence URLs, one per line (GitHub link, tx hash, forum post…)"}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
      </Field>

      <Field label="Why this is a breach">
        <textarea
          rows={2}
          placeholder="Which specific obligation was violated, and how?"
          value={breachReason}
          onChange={(e) => setBreachReason(e.target.value)}
          className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper"
        />
      </Field>

      <Field label="Similar precedent, if known">
        <input
          placeholder="Case ID (e.g. CASE_3), optional"
          value={similarPrecedent}
          onChange={(e) => setSimilarPrecedent(e.target.value)}
          className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
        />
      </Field>

      <label className="flex items-start gap-2 text-xs text-parchment/80">
        <input
          type="checkbox"
          checked={bondConfirmed}
          onChange={(e) => setBondConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I understand this claim is recorded on-chain and reviewed by GenLayer
          validators against the agreement text and evidence provided.
        </span>
      </label>

      {error && <p className="text-dispute text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-dispute text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Filing…" : "Submit Dispute"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}
