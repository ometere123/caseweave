"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getExplorerTxUrl,
  readContract,
  readReceiverContract,
  writeContract,
  writeReceiverContract,
} from "../../../lib/genlayer";
import { useWallet } from "../../../store/useWallet";
import type {
  Agreement,
  AgreementSpec,
  CustodyRecord,
  Dispute,
  Milestone,
  TransferRecord,
} from "../../../lib/contract";
import { buildRegisterDeliveryProofArgs } from "../../../lib/contract";
import { ALLOWED_REQUESTED_OUTCOMES } from "../../../lib/contract";
import { ObligationLens } from "../../../components/ObligationLens";
import { AgreementTextViewer } from "../../../components/AgreementTextViewer";
import { CaseTimeline } from "../../../components/CaseTimeline";

export function AgreementChamberClient({ agreementId }: { agreementId: string }) {
  const { address, connect } = useWallet();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [spec, setSpec] = useState<AgreementSpec | null>(null);
  const [milestones, setMilestones] = useState<Record<string, Milestone>>({});
  const [disputes, setDisputes] = useState<Record<string, Dispute>>({});
  const [transfers, setTransfers] = useState<Record<string, TransferRecord>>({});
  const [custody, setCustody] = useState<Record<string, CustodyRecord>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [fundAmount, setFundAmount] = useState("100");
  const [refundAmount, setRefundAmount] = useState("");
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ag, commitment, milestoneRows, disp, transferRows] = await Promise.all([
        readContract("get_agreement", [agreementId]),
        readContract("get_agreement_spec", [agreementId]),
        readContract("list_milestones", [agreementId]),
        readContract("list_disputes_by_agreement", [agreementId]),
        readContract("list_transfers", [agreementId]),
      ]);
      const parsedTransfers = transferRows as Record<string, TransferRecord>;
      const custodyEntries = await Promise.all(
        Object.keys(parsedTransfers).map(async (transferId) => {
          try {
            const record = (await readReceiverContract("get_custody", [transferId])) as CustodyRecord;
            return [transferId, record] as const;
          } catch {
            return null;
          }
        }),
      );
      setAgreement(ag as Agreement);
      setSpec(commitment as AgreementSpec);
      setMilestones(milestoneRows as Record<string, Milestone>);
      setDisputes(disp as Record<string, Dispute>);
      setTransfers(parsedTransfers);
      setCustody(Object.fromEntries(custodyEntries.filter((entry): entry is readonly [string, CustodyRecord] => entry !== null)));
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
      const result = await writeContract(address, "accept_agreement", [agreementId]);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept agreement");
    } finally {
      setBusy(false);
    }
  }

  async function handleFund() {
    if (!address) return connect();
    const amount = Number(fundAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Funding amount must be a positive whole number of GEN.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await writeContract(
        address,
        "fund_agreement",
        [agreementId, amount],
        BigInt(amount),
      );
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fund agreement");
    } finally {
      setBusy(false);
    }
  }

  async function handleFundMilestone(milestoneId: string) {
    if (!address) return connect();
    setBusy(true);
    setError(null);
    try {
      const result = await writeContract(address, "fund_milestone", [agreementId, milestoneId]);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate milestone funds");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefundAvailable() {
    if (!address) return connect();
    const amount = Number(refundAmount);
    const available = Number(agreement?.escrow?.available ?? 0);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > available) {
      setError("Refund must be a positive whole number no greater than available escrow.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await writeContract(address, "refund_available", [agreementId, amount]);
      setLastTransaction(result.hash);
      setRefundAmount("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create available-balance refund");
    } finally {
      setBusy(false);
    }
  }

  async function handleReconcileFailedTransfer(transferId: string) {
    if (!address) return connect();
    setBusy(true);
    setError(null);
    try {
      const result = await writeContract(address, "reconcile_failed_transfer", [transferId]);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile the transfer");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw(transferId: string) {
    if (!address) return connect();
    setBusy(true);
    setError(null);
    try {
      const result = await writeReceiverContract(address, "withdraw", [transferId]);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit custody withdrawal");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliveryProof(input: {
    milestoneId: string;
    repositoryUrl: string;
    repositoryIdentity: string;
    commitSha: string;
    pullRequest: Record<string, unknown>;
    changedFiles: string[];
    ciResults: Record<string, unknown>;
    deploymentArtifacts: string[];
    evidenceUrl: string;
  }) {
    if (!address) return connect();
    setBusy(true);
    setError(null);
    try {
      const submitted = await writeContract(address, "submit_deliverable", [agreementId, input.milestoneId, `github:${input.commitSha}`]);
      setLastTransaction(submitted.hash);
      const registered = await writeContract(
        address,
        "register_delivery_proof",
        buildRegisterDeliveryProofArgs({ agreementId, ...input }),
      );
      setLastTransaction(registered.hash);
      setSelectedMilestoneId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register delivery proof");
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
  const transferEntries = Object.values(transfers);

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
          {spec && (
            <Panel title="Immutable technical commitment">
              <p className="text-xs text-parchment/90 leading-relaxed">{spec.acceptance_criteria}</p>
              <p className="text-[11px] text-muted mt-3">repository identity</p>
              <p className="text-xs font-mono text-paper break-all">{spec.repository_identity || "not specified"}</p>
              {spec.repository_url && (
                <a href={spec.repository_url} target="_blank" rel="noreferrer" className="text-xs text-citation underline break-all">
                  Open committed repository
                </a>
              )}
              <p className="text-[11px] text-muted mt-3">commitment SHA-256</p>
              <p className="text-[10px] font-mono text-paper break-all">{spec.commitment_hash}</p>
              <p className="text-xs text-muted mt-3">{spec.completion_conditions}</p>
            </Panel>
          )}
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

          <Panel title="Escrow accounting">
            <div className="grid grid-cols-2 gap-y-2 text-xs font-mono">
              <span className="text-muted">deposited</span><span className="text-paper text-right">{agreement.escrow?.actual_deposited ?? 0} GEN</span>
              <span className="text-muted">available</span><span className="text-paper text-right">{agreement.escrow?.available ?? 0} GEN</span>
              <span className="text-muted">committed</span><span className="text-paper text-right">{agreement.escrow?.committed ?? 0} GEN</span>
              <span className="text-muted">pending transfer</span><span className="text-paper text-right">{agreement.escrow?.pending_transfer ?? 0} GEN</span>
              <span className="text-muted">settled</span><span className="text-paper text-right">{agreement.escrow?.settled ?? 0} GEN</span>
            </div>
            {address?.toLowerCase() === agreement.creator.toLowerCase() && ["active", "disputed"].includes(agreement.status) && (
              <div className="mt-4 space-y-2">
                <label className="block text-[10px] uppercase tracking-wide text-muted">Fund agreement with native GEN</label>
                <div className="flex gap-2">
                  <input aria-label="Funding amount in GEN" type="number" min={1} step={1} value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="input" />
                  <button onClick={handleFund} disabled={busy} className="bg-gold text-ink font-mono text-xs px-3 rounded-sm disabled:opacity-50">{busy ? "Funding…" : "Fund"}</button>
                </div>
                <p className="text-[11px] text-muted">Displayed amounts are not deposited funds until this payable transaction finalizes.</p>
              </div>
            )}
            {address?.toLowerCase() === agreement.creator.toLowerCase() && Number(agreement.escrow?.available ?? 0) > 0 && (
              <div className="mt-4 space-y-2 border-t border-line/30 pt-3">
                <label className="block text-[10px] uppercase tracking-wide text-muted">Refund uncommitted available GEN</label>
                <div className="flex gap-2">
                  <input aria-label="Refund amount in GEN" type="number" min={1} max={agreement.escrow?.available ?? 0} step={1} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="input" placeholder="Amount" />
                  <button onClick={handleRefundAvailable} disabled={busy} className="border border-gold/60 text-gold font-mono text-xs px-3 rounded-sm disabled:opacity-50">{busy ? "Preparing…" : "Refund"}</button>
                </div>
                <p className="text-[11px] text-muted">Only uncommitted available balance is refundable; committed or pending liabilities remain locked.</p>
              </div>
            )}
          </Panel>

          <Panel title="Payment reconciliation">
            {transferEntries.length === 0 ? (
              <p className="text-xs text-muted italic">No settlement transfer has been created.</p>
            ) : (
              <div className="space-y-3">
                {transferEntries.map((transfer) => (
                  <div key={transfer.transfer_id} className="border border-line/40 rounded-sm p-2">
                    <div className="flex justify-between gap-2 text-xs font-mono">
                      <span className="text-paper">{transfer.transfer_id}</span>
                      <span className="text-verdict uppercase">{transfer.status}</span>
                    </div>
                    <p className="text-[11px] text-muted mt-1">{transfer.amount} GEN · recipient {transfer.recipient.slice(0, 12)}…</p>
                    {transfer.child_transaction_id && (
                      <a
                        className="text-[10px] text-citation underline break-all"
                        href={getExplorerTxUrl(transfer.child_transaction_id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        child transfer {transfer.child_transaction_id.slice(0, 14)}…
                      </a>
                    )}
                    {transfer.status === "pending" && (
                      <p className="text-[10px] text-muted mt-1">Awaiting child finality and recipient confirmation.</p>
                    )}
                    {transfer.status === "failed" && isParty && (
                      <button onClick={() => handleReconcileFailedTransfer(transfer.transfer_id)} disabled={busy} className="mt-2 border border-dispute/60 text-dispute font-mono text-[10px] px-2 py-1 rounded-sm disabled:opacity-50">Reconcile failed transfer</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Custody and beneficiary withdrawal">
            {transferEntries.length === 0 ? (
              <p className="text-xs text-muted italic">Custody appears after a court-to-receiver transfer is finalized.</p>
            ) : (
              <div className="space-y-3">
                {transferEntries.map((transfer) => {
                  const record = custody[transfer.transfer_id];
                  if (!record) return null;
                  const isBeneficiary = address?.toLowerCase() === record.beneficiary.toLowerCase();
                  return (
                    <div key={record.transfer_id} className="border border-line/40 rounded-sm p-2">
                      <div className="flex justify-between gap-2 text-xs font-mono"><span className="text-paper">{record.transfer_id}</span><span className="text-verdict uppercase">{record.status.replace(/_/g, " ")}</span></div>
                      <p className="text-[11px] text-muted mt-1">{record.amount} GEN · beneficiary <span className="break-all">{record.beneficiary}</span></p>
                      {record.status === "custodied" && isBeneficiary && (
                        <button onClick={() => handleWithdraw(record.transfer_id)} disabled={busy} className="mt-2 bg-verdict text-ink font-mono text-[10px] px-2 py-1 rounded-sm disabled:opacity-50">{busy ? "Submitting…" : "Withdraw custody"}</button>
                      )}
                      {record.status === "withdrawal_submitted" && (
                        <p className="text-[10px] text-muted mt-2">EOA withdrawal submitted. This contract status is not an externally verified delivery receipt.</p>
                      )}
                      {record.withdrawal_child_transaction_id && (
                        <a className="text-[10px] text-citation underline break-all block mt-1" href={getExplorerTxUrl(record.withdrawal_child_transaction_id)} target="_blank" rel="noreferrer">inspect recorded child hash</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Milestones">
            {Object.values(milestones).length === 0 ? <p className="text-xs text-muted italic">No named milestones.</p> : (
              <div className="space-y-2">
                {Object.values(milestones).map((milestone) => (
                  <div key={milestone.milestone_id} className="border border-line/40 rounded-sm p-2">
                    <div className="flex justify-between gap-2"><span className="text-xs text-paper">{milestone.name}</span><span className="font-mono text-[10px] text-gold">{milestone.status}</span></div>
                    <p className="text-[11px] text-muted mt-1">{milestone.acceptance_criteria}</p>
                    <p className="font-mono text-[10px] text-muted mt-1">{milestone.amount} GEN · due {milestone.deadline}</p>
                    {address?.toLowerCase() === agreement.creator.toLowerCase() && milestone.status === "unfunded" && (
                      <button onClick={() => handleFundMilestone(milestone.milestone_id)} disabled={busy} className="mt-2 border border-gold/60 text-gold font-mono text-[10px] px-2 py-1 rounded-sm disabled:opacity-50">Allocate committed funds</button>
                    )}
                    {address?.toLowerCase() === agreement.creator.toLowerCase() && ["funded", "submitted"].includes(milestone.status) && (
                      <button onClick={() => setSelectedMilestoneId(milestone.milestone_id)} className="mt-2 border border-citation/60 text-citation font-mono text-[10px] px-2 py-1 rounded-sm">Register proof</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedMilestoneId && (
              <DeliveryProofForm
                repositoryIdentity={spec?.repository_identity ?? ""}
                onSubmit={(input) => handleDeliveryProof({ milestoneId: selectedMilestoneId, ...input })}
                busy={busy}
              />
            )}
          </Panel>

          {lastTransaction && (
            <p className="text-[11px] text-muted">Last finalized transaction: <a className="text-citation underline" href={getExplorerTxUrl(lastTransaction)} target="_blank" rel="noreferrer">{lastTransaction.slice(0, 14)}…</a></p>
          )}

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

function DeliveryProofForm({
  repositoryIdentity,
  onSubmit,
  busy,
}: {
  repositoryIdentity: string;
  onSubmit: (input: {
    repositoryUrl: string;
    repositoryIdentity: string;
    commitSha: string;
    pullRequest: Record<string, unknown>;
    changedFiles: string[];
    ciResults: Record<string, unknown>;
    deploymentArtifacts: string[];
    evidenceUrl: string;
  }) => void;
  busy: boolean;
}) {
  const [repositoryUrl, setRepositoryUrl] = useState("https://github.com/ometere123/caseweave");
  const [identity, setIdentity] = useState(repositoryIdentity);
  const [commitSha, setCommitSha] = useState("");
  const [pullRequestNumber, setPullRequestNumber] = useState("");
  const [changedFiles, setChangedFiles] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [ciStatus, setCiStatus] = useState("success");
  const [deploymentArtifact, setDeploymentArtifact] = useState("");

  return (
    <div className="mt-3 border border-citation/30 rounded-sm p-3 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-citation">Authenticated delivery proof</p>
      <p className="text-[11px] text-muted">Use a full commit SHA and a raw.githubusercontent.com URL containing that exact SHA. Validators fetch the source independently.</p>
      <input aria-label="Repository URL" value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} placeholder="GitHub repository URL" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <input aria-label="Repository identity" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="owner/repository" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <input aria-label="Immutable commit SHA" required value={commitSha} onChange={(e) => setCommitSha(e.target.value)} placeholder="Immutable commit SHA" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Pull request number" value={pullRequestNumber} onChange={(e) => setPullRequestNumber(e.target.value)} placeholder="PR number" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper" />
        <select aria-label="CI result" value={ciStatus} onChange={(e) => setCiStatus(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper"><option>success</option><option>failure</option><option>inconclusive</option></select>
      </div>
      <textarea aria-label="Changed files" rows={2} value={changedFiles} onChange={(e) => setChangedFiles(e.target.value)} placeholder="Changed files, one per line" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <input aria-label="Pinned evidence URL" required value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://raw.githubusercontent.com/owner/repo/SHA/file" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <input aria-label="Deployment artifact URL" value={deploymentArtifact} onChange={(e) => setDeploymentArtifact(e.target.value)} placeholder="Optional deployment artifact URL" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <button
        onClick={() => onSubmit({
          repositoryUrl,
          repositoryIdentity: identity,
          commitSha,
          pullRequest: { number: Number(pullRequestNumber) || 0, immutable_commit: commitSha },
          changedFiles: changedFiles.split("\n").map((value) => value.trim()).filter(Boolean),
          ciResults: { status: ciStatus, commit_sha: commitSha },
          deploymentArtifacts: deploymentArtifact ? [deploymentArtifact] : [],
          evidenceUrl,
        })}
        disabled={busy || !commitSha || !evidenceUrl}
        className="bg-citation text-ink font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50"
      >{busy ? "Registering…" : "Submit and register proof"}</button>
    </div>
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
