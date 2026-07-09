"use client";

import { useEffect, useState, useCallback } from "react";
import { readContract, writeContract } from "../../../lib/genlayer";
import { useWallet } from "../../../store/useWallet";
import type { Dispute, EvidenceItem } from "../../../lib/contract";
import type { CalldataEncodable } from "genlayer-js/types";
import { EvidenceRail } from "../../../components/EvidenceRail";
import { PrecedentBench } from "../../../components/PrecedentBench";
import { VerdictPanel } from "../../../components/VerdictPanel";

type EvidenceState = { claimant: EvidenceItem[]; respondent: EvidenceItem[] };

export function DisputeCourtroomClient({ disputeId }: { disputeId: string }) {
  const { address, connect } = useWallet();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidence, setEvidence] = useState<EvidenceState>({ claimant: [], respondent: [] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, ev] = await Promise.all([
        readContract("get_dispute", [disputeId]),
        readContract("list_evidence_for_dispute", [disputeId]),
      ]);
      setDispute(d as Dispute);
      setEvidence(ev as EvidenceState);
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
      await writeContract(address, action, args);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${action}`);
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
