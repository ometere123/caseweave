"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract, writeContract } from "../../lib/genlayer";
import { useWallet } from "../../store/useWallet";
import type { Appeal, Dispute } from "../../lib/contract";
import { AppealGroundSelector } from "../../components/AppealGroundSelector";

export default function AppealsPage() {
  const { address, connect } = useWallet();
  const [appeals, setAppeals] = useState<Record<string, Appeal> | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Dispute["verdict"]>>({});
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [disputeId, setDisputeId] = useState("");
  const [ground, setGround] = useState("");
  const [requestedChange, setRequestedChange] = useState("");
  const [bond, setBond] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = (await readContract("list_appeals")) as Record<string, Appeal>;
      setAppeals(res);

      const uniqueDisputeIds = Array.from(
        new Set(Object.values(res).map((a) => a.dispute_id))
      );
      const disputeVerdicts = await Promise.all(
        uniqueDisputeIds.map(async (id) => {
          try {
            const dispute = (await readContract("get_dispute", [id])) as Dispute;
            return [id, dispute.verdict] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      setVerdicts(Object.fromEntries(disputeVerdicts));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appeals");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return connect();
    setSubmitting(true);
    setError(null);
    try {
      await writeContract(address, "file_appeal", [
        disputeId,
        ground,
        requestedChange,
        Number(bond) || 0,
      ]);
      setShowForm(false);
      setDisputeId("");
      setGround("");
      setRequestedChange("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to file appeal");
    } finally {
      setSubmitting(false);
    }
  }

  const entries = appeals ? Object.values(appeals) : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
            Appeal Docket
          </p>
          <h1 className="font-display text-3xl text-paper">Appeals</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-gold text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ File Appeal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-line/40 rounded-sm p-4 mb-8 space-y-3 bg-charcoal/40">
          <input
            required
            placeholder="Dispute ID (e.g. DIS_1)"
            value={disputeId}
            onChange={(e) => setDisputeId(e.target.value)}
            className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
          />
          <AppealGroundSelector value={ground} onChange={setGround} />
          <textarea
            required
            rows={3}
            placeholder="Requested change"
            value={requestedChange}
            onChange={(e) => setRequestedChange(e.target.value)}
            className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper"
          />
          <input
            type="number"
            min={1}
            placeholder="Bond amount"
            value={bond}
            onChange={(e) => setBond(e.target.value)}
            className="w-full bg-ink border border-line/50 rounded-sm px-3 py-2 text-sm text-paper font-mono"
          />
          <button
            type="submit"
            disabled={submitting || !ground}
            className="bg-dispute text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Filing…" : "Submit Appeal"}
          </button>
        </form>
      )}

      {error && <p className="text-dispute text-sm mb-4">{error}</p>}
      {appeals !== null && entries.length === 0 && (
        <p className="text-muted text-sm italic">No appeals filed yet.</p>
      )}

      <div className="space-y-3">
        {entries.map((a) => {
          const originalVerdict = verdicts[a.dispute_id];
          return (
            <div key={a.appeal_id} className="border border-line/40 rounded-sm p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gold">{a.appeal_id}</span>
                <span className="font-mono text-[11px] uppercase text-muted">{a.status}</span>
              </div>
              <p className="text-xs text-muted mt-1">
                dispute{" "}
                <Link href={`/disputes/${a.dispute_id}`} className="text-citation hover:underline">
                  {a.dispute_id}
                </Link>{" "}
                · ground: {a.appeal_ground.replace(/_/g, " ")}
              </p>
              <p className="text-xs font-mono text-muted mt-1 break-all">
                appellant: {a.appellant}
              </p>
              {originalVerdict && (
                <p className="text-xs text-muted mt-1">
                  original verdict:{" "}
                  <span className="text-paper">{originalVerdict.verdict.replace(/_/g, " ")}</span>
                  {" "}({originalVerdict.confidence}% confidence)
                </p>
              )}
              <p className="text-sm text-parchment/90 mt-2">{a.requested_change}</p>
              <p className="text-xs font-mono text-muted mt-2">
                bond: {a.bond_amount} GEN {a.result && `· result: ${a.result.replace(/_/g, " ")}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
