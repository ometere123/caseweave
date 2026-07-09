"use client";

import { useEffect, useState } from "react";
import { readContract } from "../../lib/genlayer";
import { useWallet } from "../../store/useWallet";
import type { Agreement, Dispute, Appeal } from "../../lib/contract";

export default function ProfilePage() {
  const { address, connect } = useWallet();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    const currentAddress = address;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const allAgreements = Object.values(
          (await readContract("list_agreements")) as Record<string, Agreement>
        );
        const mine = allAgreements.filter(
          (a) =>
            a.creator.toLowerCase() === currentAddress.toLowerCase() ||
            a.counterparty.toLowerCase() === currentAddress.toLowerCase()
        );
        setAgreements(mine);

        const disputeLists = await Promise.all(
          mine.map((a) => readContract("list_disputes_by_agreement", [a.agreement_id]))
        );
        const allDisputes = disputeLists.flatMap((d) =>
          Object.values(d as Record<string, Dispute>)
        );
        setDisputes(allDisputes);

        const allAppeals = Object.values(
          (await readContract("list_appeals")) as Record<string, Appeal>
        );
        setAppeals(
          allAppeals.filter(
            (a) => a.appellant.toLowerCase() === currentAddress.toLowerCase()
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    queueMicrotask(() => {
      void loadProfile();
    });
  }, [address]);

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-14 text-center">
        <p className="text-muted mb-4">Connect your wallet to view your case history.</p>
        <button
          onClick={connect}
          className="bg-gold text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const walletAddress = address;
  const asClaimant = disputes.filter((d) => d.claimant.toLowerCase() === address.toLowerCase());
  const asRespondent = disputes.filter((d) => d.respondent.toLowerCase() === address.toLowerCase());
  const finalized = disputes.filter((d) => d.status === "finalized" && d.verdict);
  const wins = finalized.filter((d) => {
    const isClaimant = d.claimant.toLowerCase() === address.toLowerCase();
    const score = isClaimant ? d.verdict!.claimant_score : d.verdict!.respondent_score;
    const otherScore = isClaimant ? d.verdict!.respondent_score : d.verdict!.claimant_score;
    return score > otherScore;
  }).length;
  const losses = finalized.length - wins;
  const precedentsCreated = disputes.filter((d) => d.final_case_id).length;
  const badFaithFindings = finalized.filter(
    (d) => d.verdict?.verdict === "bad_faith_claim"
  ).length;

  function roleWinRate(role: "claimant" | "respondent") {
    const asRole = finalized.filter((d) =>
      role === "claimant"
        ? d.claimant.toLowerCase() === walletAddress.toLowerCase()
        : d.respondent.toLowerCase() === walletAddress.toLowerCase()
    );
    if (asRole.length === 0) return null;
    const roleWins = asRole.filter((d) => {
      const score = role === "claimant" ? d.verdict!.claimant_score : d.verdict!.respondent_score;
      const otherScore = role === "claimant" ? d.verdict!.respondent_score : d.verdict!.claimant_score;
      return score > otherScore;
    }).length;
    return Math.round((roleWins / asRole.length) * 100);
  }

  const claimantWinRate = roleWinRate("claimant");
  const respondentWinRate = roleWinRate("respondent");
  const settlementHistory = [...finalized].sort((a, b) =>
    b.dispute_id.localeCompare(a.dispute_id, undefined, { numeric: true })
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        User Case History
      </p>
      <h1 className="font-display text-3xl text-paper mb-1">Profile</h1>
      <p className="font-mono text-xs text-muted mb-8 break-all">{address}</p>

      {error && <p className="text-dispute text-sm mb-4">{error}</p>}
      {loading && <p className="text-muted text-sm mb-4">Loading case history…</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Agreements created" value={agreements.filter((a) => a.creator.toLowerCase() === address.toLowerCase()).length} />
        <Stat label="Disputes filed" value={asClaimant.length} />
        <Stat label="Disputes responded to" value={asRespondent.length} />
        <Stat label="Case wins" value={wins} />
        <Stat label="Case losses" value={losses} />
        <Stat label="Precedents created" value={precedentsCreated} />
        <Stat label="Bad-faith findings" value={badFaithFindings} />
        <Stat label="Appeals filed" value={appeals.length} />
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-4">
        <div className="border border-line/40 rounded-sm p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">
            Reputation as claimant
          </p>
          <p className="font-mono text-2xl text-paper">
            {claimantWinRate === null ? "-" : `${claimantWinRate}%`}
          </p>
          <p className="text-[11px] text-muted mt-1">win rate across finalized disputes filed</p>
        </div>
        <div className="border border-line/40 rounded-sm p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">
            Reputation as respondent
          </p>
          <p className="font-mono text-2xl text-paper">
            {respondentWinRate === null ? "-" : `${respondentWinRate}%`}
          </p>
          <p className="text-[11px] text-muted mt-1">win rate across finalized disputes responded to</p>
        </div>
      </div>

      <div className="mt-10">
        <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-3">
          Agreements
        </p>
        <div className="space-y-2">
          {agreements.map((a) => (
            <div key={a.agreement_id} className="border border-line/40 rounded-sm p-3 flex items-center justify-between">
              <span className="text-sm text-paper">{a.title}</span>
              <span className="font-mono text-[11px] text-muted uppercase">{a.status.replace(/_/g, " ")}</span>
            </div>
          ))}
          {agreements.length === 0 && (
            <p className="text-sm text-muted italic">No agreements yet.</p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-3">
          Settlement History
        </p>
        <div className="space-y-2">
          {settlementHistory.map((d) => {
            const isClaimant = d.claimant.toLowerCase() === address.toLowerCase();
            return (
              <div key={d.dispute_id} className="border border-line/40 rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gold">{d.dispute_id}</span>
                  <span className="font-mono text-[11px] text-muted uppercase">
                    as {isClaimant ? "claimant" : "respondent"}
                  </span>
                </div>
                <p className="text-xs text-parchment/80 mt-1">
                  outcome: {d.verdict?.verdict.replace(/_/g, " ")}
                  {d.final_case_id && ` · precedent ${d.final_case_id}`}
                </p>
              </div>
            );
          })}
          {settlementHistory.length === 0 && (
            <p className="text-sm text-muted italic">No finalized disputes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line/40 rounded-sm p-4">
      <p className="font-mono text-2xl text-paper">{value}</p>
      <p className="text-[11px] text-muted mt-1">{label}</p>
    </div>
  );
}
