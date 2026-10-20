"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getExplorerTxUrl,
  readContract,
  writeContract,
  writeJudgmentConsumer,
} from "../../../lib/genlayer";
import { useWallet } from "../../../store/useWallet";
import {
  CASEWEAVE_CONTRACT_ADDRESS,
  buildConsumeJudgmentArgs,
} from "../../../lib/contract";
import type {
  Agreement,
  Appeal,
  Dispute,
  DisputeProcedure,
  EvidenceItem,
  Judgment,
} from "../../../lib/contract";
import { buildSetAppealWindowArgs, buildSetDisputeDeadlinesArgs } from "../../../lib/contract";
import type { CalldataEncodable } from "genlayer-js/types";
import { EvidenceRail } from "../../../components/EvidenceRail";
import { PrecedentBench } from "../../../components/PrecedentBench";
import { VerdictPanel } from "../../../components/VerdictPanel";

type EvidenceState = { claimant: EvidenceItem[]; respondent: EvidenceItem[] };

export function DisputeCourtroomClient({ disputeId }: { disputeId: string }) {
  const { address, connect } = useWallet();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidence, setEvidence] = useState<EvidenceState>({ claimant: [], respondent: [] });
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [procedure, setProcedure] = useState<DisputeProcedure | null>(null);
  const [appeals, setAppeals] = useState<Record<string, Appeal>>({});
  const [agreementCreator, setAgreementCreator] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = (await readContract("get_dispute", [disputeId])) as Dispute;
      const [ev, currentJudgment, currentProcedure, allAppeals, agreement] = await Promise.all([
        readContract("list_evidence_for_dispute", [disputeId]),
        readContract("get_current_judgment", [disputeId]),
        readContract("get_dispute_procedure", [disputeId]),
        readContract("list_appeals"),
        readContract("get_agreement", [d.agreement_id]),
      ]);
      setDispute(d);
      setEvidence(ev as EvidenceState);
      const parsedJudgment = currentJudgment as Judgment;
      setJudgment(parsedJudgment?.judgment_id ? parsedJudgment : null);
      setProcedure(currentProcedure as DisputeProcedure);
      setAgreementCreator((agreement as Agreement).creator);
      setAppeals(
        Object.fromEntries(
          Object.entries(allAppeals as Record<string, Appeal>).filter(([, item]) => item.dispute_id === disputeId),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispute");
    }
  }, [disputeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function runAction(action: string, args: CalldataEncodable[] = []) {
    if (!address) return connect();
    setBusy(action);
    setError(null);
    try {
      const result = await writeContract(address, action, args);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${action}`);
    } finally {
      setBusy(null);
    }
  }

  async function runPayableAction(action: string, args: CalldataEncodable[], value: bigint) {
    if (!address) return connect();
    setBusy(action);
    setError(null);
    try {
      const result = await writeContract(address, action, args, value);
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${action}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleConsumeJudgment() {
    if (!address) return connect();
    if (!judgment || !procedure) return;
    setBusy("consume_judgment");
    setError(null);
    try {
      const result = await writeJudgmentConsumer(
        address,
        "consume_judgment",
        buildConsumeJudgmentArgs({
          courtAddress: CASEWEAVE_CONTRACT_ADDRESS,
          judgmentId: judgment.judgment_id,
          agreementId: dispute!.agreement_id,
          disputeId,
          version: judgment.version,
        }),
      );
      setLastTransaction(result.hash);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to consume the judgment");
    } finally {
      setBusy(null);
    }
  }

  if (error && !dispute) return <div className="max-w-6xl mx-auto px-6 py-14 text-dispute">{error}</div>;
  if (!dispute) return <div className="max-w-6xl mx-auto px-6 py-14 text-muted">Loading courtroom…</div>;

  const isClaimant = address?.toLowerCase() === dispute.claimant.toLowerCase();
  const isRespondent = address?.toLowerCase() === dispute.respondent.toLowerCase();
  const isParty = isClaimant || isRespondent;
  const canEditEvidence = !["finalized", "under_appeal"].includes(dispute.status);
  const hasVerifiedEvidence = [...evidence.claimant, ...evidence.respondent].some(
    (e) => e.status === "verified"
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      {/* Case Header */}
      <div className="border-b border-line/40 pb-6 mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
          Dispute Courtroom · {dispute.dispute_id}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-3xl text-paper">
            {dispute.requested_outcome.replace(/_/g, " ")}
          </h1>
          <span className="font-mono text-xs uppercase text-muted border border-line/50 rounded-sm px-2 py-1">
            {dispute.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex gap-8 mt-3 font-mono text-xs text-muted">
          <span>claimant: {dispute.claimant.slice(0, 10)}…</span>
          <span>respondent: {dispute.respondent.slice(0, 10)}…</span>
        </div>
      </div>

      {procedure && (
        <ProcedurePanel
          key={`${procedure.deadlines_status}:${procedure.appeal_deadline_status}:${procedure.response_deadline}:${procedure.appeal_deadline}`}
          dispute={dispute}
          procedure={procedure}
          isParty={isParty}
          address={address}
          busy={busy}
          onAction={runAction}
        />
      )}

      {error && <p className="text-dispute text-sm mb-4">{error}</p>}

      {/* Three panel courtroom */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Claimant Brief */}
        <div className="space-y-3">
          <SectionLabel>Claimant Brief</SectionLabel>
          <p className="text-sm text-parchment/90 leading-relaxed">
            {dispute.claim_summary}
          </p>
          <EvidenceRail
            disputeId={disputeId}
            side="claimant"
            label="Evidence"
            items={evidence.claimant}
            canAdd={canEditEvidence && isClaimant}
            onChanged={load}
          />
          {canEditEvidence && isParty && evidence.claimant.length > 0 && (
            <ChallengeForm
              disputeId={disputeId}
              side="claimant"
              onSubmit={(index, category, claim, counterUrl) =>
                runAction("challenge_evidence", [disputeId, "claimant", index, category, claim, counterUrl])
              }
              busy={busy === "challenge_evidence"}
            />
          )}
          {dispute.verdict && (
            <p className="font-mono text-xs text-muted">
              score after verdict: {dispute.verdict.claimant_score}
            </p>
          )}
        </div>

        {/* Precedent Bench */}
        <div className="space-y-3">
          <SectionLabel>Precedent Bench</SectionLabel>
          <PrecedentBench search={dispute.precedent_search} />
        </div>

        {/* Respondent Brief */}
        <div className="space-y-3">
          <SectionLabel>Respondent Brief</SectionLabel>
          {dispute.status === "awaiting_response" ? (
            isRespondent ? (
              <ResponseForm
                onSubmit={(summary, urls) =>
                  runAction("submit_response", [disputeId, summary, urls])
                }
                busy={busy === "submit_response"}
              />
            ) : (
              <p className="text-sm text-muted italic">Awaiting respondent&apos;s reply.</p>
            )
          ) : (
            <>
              <p className="text-sm text-parchment/90 leading-relaxed">
                {dispute.response_summary || "No response was submitted."}
              </p>
              <EvidenceRail
                disputeId={disputeId}
                side="respondent"
                label="Counter-evidence"
                items={evidence.respondent}
                canAdd={canEditEvidence && isRespondent}
                onChanged={load}
              />
              {dispute.verdict && (
                <p className="font-mono text-xs text-muted">
                  score after verdict: {dispute.verdict.respondent_score}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Verdict Engine */}
      <div className="mt-12 border-t border-line/40 pt-8">
        <SectionLabel>Verdict Engine</SectionLabel>

        {dispute.status === "awaiting_precedent_search" && (
          <button
            onClick={() => runAction("request_precedent_search", [disputeId])}
            disabled={busy === "request_precedent_search"}
            className="mt-4 bg-citation text-ink font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy === "request_precedent_search"
              ? "Searching case memory…"
              : "Request Precedent Search"}
          </button>
        )}

        {dispute.status === "awaiting_verdict" && (
          <div className="mt-4">
            <button
              onClick={() => runAction("request_verdict", [disputeId])}
              disabled={busy === "request_verdict" || !hasVerifiedEvidence}
              className="bg-gold text-ink font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 disabled:opacity-50"
            >
              {busy === "request_verdict" ? "Validators deliberating…" : "Request Verdict"}
            </button>
            {!hasVerifiedEvidence && (
              <p className="text-xs text-muted italic mt-2">
                At least one evidence item must be verified (fetched and
                hashed by GenLayer validators) before a verdict can be
                requested.
              </p>
            )}
          </div>
        )}

        {dispute.verdict && (
          <div className="mt-6">
            <VerdictPanel verdict={dispute.verdict} />
          </div>
        )}

        {dispute.status === "verdict_reached" && isParty && (
          <button
            onClick={() => runAction("finalize_precedent", [disputeId])}
            disabled={busy === "finalize_precedent"}
            className="mt-6 bg-verdict text-ink font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy === "finalize_precedent" ? "Finalizing…" : "Finalize Precedent"}
          </button>
        )}

      {dispute.status === "finalized" && dispute.final_case_id && (
          <p className="mt-6 font-mono text-sm text-verdict">
            Case memory created: {dispute.final_case_id}.{" "}
            <a href={`/cases/${dispute.final_case_id}`} className="underline">
              View case
            </a>
          </p>
        )}

        {judgment && (
          <div className="mt-6 border border-citation/40 rounded-sm p-4 bg-citation/5">
            <SectionLabel>Canonical judgment</SectionLabel>
            <div className="grid md:grid-cols-3 gap-3 mt-3 text-xs font-mono">
              <div><span className="text-muted block">judgment</span><span className="text-paper">{judgment.judgment_id}</span></div>
              <div><span className="text-muted block">version / status</span><span className="text-paper">v{judgment.version} · {judgment.status}</span></div>
              <div><span className="text-muted block">appeal</span><span className="text-paper">{judgment.appeal_status}</span></div>
            </div>
            <p className="text-[11px] text-muted mt-3">Frozen evidence snapshot commitment</p>
            <p className="font-mono text-[10px] text-paper break-all">{judgment.evidence_snapshot_hash}</p>
            <p className="text-xs text-parchment/90 mt-3">Interpretation is shown separately from this source-verification commitment. A superseded judgment cannot be consumed by another contract.</p>
          </div>
        )}

        {Object.values(appeals).map((appeal) => (
          <div key={appeal.appeal_id} className="mt-4 border border-gold/40 rounded-sm p-4">
            <SectionLabel>Appellate record · {appeal.appeal_id}</SectionLabel>
            <p className="text-xs text-paper mt-2">{appeal.appeal_ground.replace(/_/g, " ")} · {appeal.status}</p>
            <p className="text-xs text-muted mt-1">{appeal.requested_change}</p>
            {appeal.result && <p className="font-mono text-xs text-verdict mt-2">Consensus result: {appeal.result.replace(/_/g, " ")}</p>}
            {appeal.status === "under_review" && (
              <button
                onClick={() => runAction("request_appeal_review", [appeal.appeal_id])}
                disabled={busy === "request_appeal_review"}
                className="mt-3 bg-gold text-ink font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50"
              >
                {busy === "request_appeal_review" ? "Appellate validators deliberating…" : "Request independent appellate review"}
              </button>
            )}
            {appeal.status === "under_review" && isParty && (
              <AppealEvidenceForm
                side={isClaimant ? "claimant" : "respondent"}
                onSubmit={(side, url) => runAction("add_appeal_evidence", [appeal.appeal_id, side, url])}
                busy={busy === "add_appeal_evidence"}
              />
            )}
            {appeal.status === "resolved" && appeal.bond_status === "eligible_for_return" && address?.toLowerCase() === appeal.appellant.toLowerCase() && (
              <button
                onClick={() => runAction("release_appeal_bond", [appeal.appeal_id])}
                disabled={busy === "release_appeal_bond"}
                className="mt-3 border border-verdict/70 text-verdict font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50"
              >
                {busy === "release_appeal_bond" ? "Preparing bond return…" : "Return appeal bond"}
              </button>
            )}
          </div>
        ))}

        {dispute.status === "finalized" && isParty && procedure?.appeal_deadline_status === "accepted" && !procedure.appeal_window_closed && judgment?.appeal_status === "not_appealed" && (
          <AppealForm
            onSubmit={(ground, requestedChange, bond) =>
              runPayableAction(
                "file_appeal",
                [disputeId, ground, requestedChange, bond],
                BigInt(bond),
              )
            }
            busy={busy === "file_appeal"}
          />
        )}

        {dispute.status === "finalized" && judgment?.status === "finalized" && judgment.appeal_status === "closed" && (
          <button
            onClick={() => runAction("settle_judgment", [disputeId])}
            disabled={busy === "settle_judgment"}
            className="mt-4 border border-verdict/70 text-verdict font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {busy === "settle_judgment" ? "Reconciling settlement…" : "Execute funded settlement"}
          </button>
        )}

        {dispute.status === "finalized" && judgment?.status === "finalized" && judgment.appeal_status === "closed" && judgment.remedy.action === "partial_release" && (
          <button
            onClick={() => runAction("refund_partial_settlement_remainder", [disputeId])}
            disabled={busy === "refund_partial_settlement_remainder"}
            className="mt-4 border border-gold/70 text-gold font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {busy === "refund_partial_settlement_remainder" ? "Preparing remainder refund…" : "Refund partial-settlement remainder"}
          </button>
        )}

        {dispute.status === "finalized" && judgment?.status === "finalized" && judgment.appeal_status === "closed" && judgment.remedy.action === "none" && agreementCreator.toLowerCase() === address?.toLowerCase() && (
          <button
            onClick={() => runAction("refund_unawarded_commitment", [disputeId])}
            disabled={busy === "refund_unawarded_commitment"}
            className="mt-4 border border-gold/70 text-gold font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {busy === "refund_unawarded_commitment" ? "Preparing no-award refund…" : "Refund unawarded committed balance"}
          </button>
        )}

        {judgment && judgment.status === "finalized" && judgment.appeal_status === "closed" && (
          <div className="mt-4 border border-citation/40 rounded-sm p-4">
            <SectionLabel>Programmable judgment consumer</SectionLabel>
            <p className="text-xs text-muted mt-2">The consumer is bound to the configured court identity and rejects stale, superseded, unresolved, or wrongly scoped judgments.</p>
            <button onClick={handleConsumeJudgment} disabled={busy === "consume_judgment"} className="mt-3 border border-citation/60 text-citation font-mono text-xs px-4 py-2 rounded-sm disabled:opacity-50">{busy === "consume_judgment" ? "Consuming…" : "Consume authoritative judgment"}</button>
          </div>
        )}

        {lastTransaction && (
          <p className="mt-4 text-[11px] text-muted">Finalized transaction: <a className="text-citation underline" href={getExplorerTxUrl(lastTransaction)} target="_blank" rel="noreferrer">{lastTransaction.slice(0, 14)}…</a></p>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-wide text-gold">
      {children}
    </p>
  );
}

function defaultUtcDeadline(hours: number, baseMs: number): string {
  return new Date(baseMs + hours * 60 * 60 * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

function ProcedurePanel({
  dispute,
  procedure,
  isParty,
  address,
  busy,
  onAction,
}: {
  dispute: Dispute;
  procedure: DisputeProcedure;
  isParty: boolean;
  address: string | null;
  busy: string | null;
  onAction: (action: string, args: CalldataEncodable[]) => void;
}) {
  const [clockNow] = useState(() => Date.now());
  const [responseDeadline, setResponseDeadline] = useState(
    procedure.proposed_response_deadline || procedure.response_deadline || defaultUtcDeadline(1, clockNow),
  );
  const [challengeDeadline, setChallengeDeadline] = useState(
    procedure.proposed_challenge_deadline || procedure.challenge_deadline || defaultUtcDeadline(2, clockNow),
  );
  const [appealDeadline, setAppealDeadline] = useState(
    procedure.proposed_appeal_deadline || procedure.appeal_deadline || defaultUtcDeadline(4, clockNow),
  );

  const caller = address?.toLowerCase();
  const deadlinesProposedByMe = Boolean(caller && procedure.deadlines_proposed_by.toLowerCase() === caller);
  const appealProposedByMe = Boolean(caller && procedure.appeal_deadline_proposed_by.toLowerCase() === caller);
  const canSetDeadlines = isParty && ["awaiting_response", "awaiting_precedent_search"].includes(dispute.status);
  const canSetAppeal = isParty && procedure.deadlines_status === "accepted" && ["awaiting_response", "awaiting_precedent_search", "awaiting_verdict"].includes(dispute.status);
  const appealPast = procedure.appeal_deadline ? Date.parse(procedure.appeal_deadline) <= clockNow : false;
  const responsePast = procedure.response_deadline ? Date.parse(procedure.response_deadline) <= clockNow : false;

  return (
    <div className="mb-8 border border-gold/40 rounded-sm p-4 bg-gold/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Mutually accepted procedure · {procedure.policy_id || "caseweave-procedure-v1"}</SectionLabel>
        <span className="font-mono text-[10px] uppercase text-muted">v{procedure.policy_version || 1}</span>
      </div>
      <p className="text-xs text-muted mt-2">Deadlines are canonical UTC timestamps. A proposal has no effect until the other party accepts the exact same values; policy bounds are enforced on-chain.</p>
      <div className="grid md:grid-cols-3 gap-3 mt-3 text-xs font-mono">
        <div><span className="text-muted block">response</span><span className="text-paper break-all">{procedure.response_deadline || procedure.proposed_response_deadline || "not committed"}</span></div>
        <div><span className="text-muted block">challenge</span><span className="text-paper break-all">{procedure.challenge_deadline || procedure.proposed_challenge_deadline || "not committed"}</span></div>
        <div><span className="text-muted block">appeal</span><span className="text-paper break-all">{procedure.appeal_deadline || procedure.proposed_appeal_deadline || "not committed"}</span></div>
      </div>

      {canSetDeadlines && procedure.deadlines_status !== "accepted" && !deadlinesProposedByMe && (
        <div className="mt-4 border-t border-line/30 pt-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-gold">Propose or accept response/challenge deadlines</p>
          <input aria-label="Response deadline UTC" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1.5 text-xs text-paper font-mono" placeholder="YYYY-MM-DDTHH:MM:SSZ" />
          <input aria-label="Challenge deadline UTC" value={challengeDeadline} onChange={(e) => setChallengeDeadline(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1.5 text-xs text-paper font-mono" placeholder="YYYY-MM-DDTHH:MM:SSZ" />
          <button onClick={() => onAction("set_dispute_deadlines", buildSetDisputeDeadlinesArgs(dispute.dispute_id, responseDeadline, challengeDeadline))} disabled={busy === "set_dispute_deadlines"} className="border border-gold/60 text-gold font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy === "set_dispute_deadlines" ? "Committing…" : procedure.deadlines_status === "proposed" ? "Accept exact proposal" : "Propose deadlines"}</button>
        </div>
      )}
      {procedure.deadlines_status === "proposed" && (
        <p className="text-[11px] text-muted mt-3">Waiting for the other party to accept the proposal from {procedure.deadlines_proposed_by.slice(0, 12)}…</p>
      )}

      {dispute.status === "awaiting_response" && procedure.deadlines_status === "accepted" && isParty && responsePast && (
        <button onClick={() => onAction("advance_after_response_deadline", [dispute.dispute_id])} disabled={busy === "advance_after_response_deadline"} className="mt-3 border border-dispute/60 text-dispute font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy === "advance_after_response_deadline" ? "Advancing…" : "Advance after missed response deadline"}</button>
      )}

      {canSetAppeal && procedure.appeal_deadline_status !== "accepted" && !appealProposedByMe && (
        <div className="mt-4 border-t border-line/30 pt-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-gold">Propose or accept appeal-window deadline</p>
          <input aria-label="Appeal deadline UTC" value={appealDeadline} onChange={(e) => setAppealDeadline(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1.5 text-xs text-paper font-mono" placeholder="YYYY-MM-DDTHH:MM:SSZ" />
          <button onClick={() => onAction("set_appeal_window", buildSetAppealWindowArgs(dispute.dispute_id, appealDeadline))} disabled={busy === "set_appeal_window"} className="border border-gold/60 text-gold font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy === "set_appeal_window" ? "Committing…" : procedure.appeal_deadline_status === "proposed" ? "Accept exact proposal" : "Propose appeal window"}</button>
        </div>
      )}
      {procedure.appeal_deadline_status === "proposed" && (
        <p className="text-[11px] text-muted mt-3">Waiting for the other party to accept the appeal deadline from {procedure.appeal_deadline_proposed_by.slice(0, 12)}…</p>
      )}

      {dispute.status === "finalized" && procedure.appeal_deadline_status === "accepted" && !procedure.appeal_window_closed && isParty && (
        <div className="mt-4 border-t border-line/30 pt-3">
          <button onClick={() => onAction("close_appeal_window", [dispute.dispute_id])} disabled={busy === "close_appeal_window" || !appealPast} className="border border-verdict/70 text-verdict font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy === "close_appeal_window" ? "Closing…" : appealPast ? "Close elapsed appeal window" : "Appeal window still open"}</button>
          <p className="text-[11px] text-muted mt-2">Settlement remains unavailable until this window is legitimately closed and no appeal is pending.</p>
        </div>
      )}
    </div>
  );
}

function AppealEvidenceForm({
  side,
  onSubmit,
  busy,
}: {
  side: "claimant" | "respondent";
  onSubmit: (side: string, url: string) => void;
  busy: boolean;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="mt-3 border border-citation/30 rounded-sm p-3 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-citation">Versioned appeal evidence · {side}</p>
      <input aria-label="Appeal evidence URL" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Allowlisted HTTPS evidence URL" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1.5 text-xs text-paper font-mono" />
      <button onClick={() => { onSubmit(side, url); setUrl(""); }} disabled={busy || !url.trim()} className="border border-citation/60 text-citation font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy ? "Adding…" : "Add appeal evidence"}</button>
    </div>
  );
}

function ResponseForm({
  onSubmit,
  busy,
}: {
  onSubmit: (summary: string, urls: string[]) => void;
  busy: boolean;
}) {
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");

  return (
    <div className="space-y-3">
      <textarea
        rows={4}
        placeholder="Response summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper"
      />
      <textarea
        rows={3}
        placeholder="Counter-evidence URLs, one per line"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
      />
      <button
        onClick={() =>
          onSubmit(
            summary,
            evidence.split("\n").map((u) => u.trim()).filter(Boolean)
          )
        }
        disabled={busy || !summary}
        className="bg-citation text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit Response"}
      </button>
    </div>
  );
}

function ChallengeForm({
  side,
  onSubmit,
  busy,
}: {
  disputeId: string;
  side: "claimant" | "respondent";
  onSubmit: (index: number, category: string, claim: string, counterUrl: string) => void;
  busy: boolean;
}) {
  const [index, setIndex] = useState("0");
  const [category, setCategory] = useState("authenticity");
  const [claim, setClaim] = useState("");
  const [counterUrl, setCounterUrl] = useState("");

  return (
    <div className="border border-gold/30 rounded-sm p-3 mt-3 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-gold">Challenge {side} evidence</p>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Evidence index" type="number" min={0} value={index} onChange={(e) => setIndex(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper" />
        <select aria-label="Challenge category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper">
          {["authenticity", "relevance", "incomplete", "misleading", "contradicted"].map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      <textarea aria-label="Challenge claim" required rows={2} value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="Identify the specific authenticity, relevance, or completeness concern." className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper" />
      <input aria-label="Counter evidence URL" value={counterUrl} onChange={(e) => setCounterUrl(e.target.value)} placeholder="Optional allowlisted counter-evidence URL" className="w-full bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper font-mono" />
      <button onClick={() => onSubmit(Number(index), category, claim, counterUrl)} disabled={busy || claim.trim().length < 10} className="border border-gold/60 text-gold font-mono text-xs px-3 py-1.5 rounded-sm disabled:opacity-50">{busy ? "Submitting…" : "Record challenge"}</button>
    </div>
  );
}

function AppealForm({
  onSubmit,
  busy,
}: {
  onSubmit: (ground: string, requestedChange: string, bond: number) => void;
  busy: boolean;
}) {
  const [ground, setGround] = useState("precedent_misapplied");
  const [requestedChange, setRequestedChange] = useState("");
  const [bond, setBond] = useState("1");

  return (
    <div className="mt-6 border border-gold/40 rounded-sm p-4 space-y-3">
      <SectionLabel>File an appeal</SectionLabel>
      <p className="text-xs text-muted">Appeals hold a real GEN bond and are decided by independent appellate consensus. The former owner-only merits write is disabled.</p>
      <select aria-label="Appeal ground" value={ground} onChange={(e) => setGround(e.target.value)} className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-xs text-paper">
        {["precedent_misapplied", "key_evidence_ignored", "new_evidence", "wrong_agreement_interpretation", "bad_faith_evidence", "outcome_inconsistent_with_holding"].map((value) => <option key={value}>{value}</option>)}
      </select>
      <textarea aria-label="Requested appellate change" required rows={3} value={requestedChange} onChange={(e) => setRequestedChange(e.target.value)} placeholder="State the precise ground and requested change." className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper" />
      <div className="flex gap-2 items-center">
        <label className="text-xs text-muted" htmlFor="appeal-bond">Bond (GEN)</label>
        <input id="appeal-bond" aria-label="Appeal bond in GEN" type="number" min={1} step={1} value={bond} onChange={(e) => setBond(e.target.value)} className="w-28 bg-ink border border-line/50 rounded-sm px-2 py-1 text-xs text-paper" />
        <button onClick={() => onSubmit(ground, requestedChange, Number(bond))} disabled={busy || requestedChange.trim().length < 10} className="bg-gold text-ink font-mono text-xs px-3 py-2 rounded-sm disabled:opacity-50">{busy ? "Filing…" : "File appeal"}</button>
      </div>
    </div>
  );
}
