"use client";

import { useState } from "react";
import { writeContract } from "../lib/genlayer";
import { useWallet } from "../store/useWallet";
import type { EvidenceItem } from "../lib/contract";

const STATUS_STYLE: Record<string, string> = {
  verified: "text-verdict border-verdict/60 bg-verdict/10",
  unverified: "text-muted border-muted/60 bg-muted/10",
  failed_fetch: "text-dispute border-dispute/60 bg-dispute/10",
  invalid_url: "text-dispute border-dispute/60 bg-dispute/10",
  unstable: "text-gold border-gold/60 bg-gold/10",
  not_relevant: "text-muted border-muted/60 bg-muted/10",
};

export function EvidenceRail({
  disputeId,
  side,
  label,
  items,
  canAdd,
  onChanged,
}: {
  disputeId: string;
  side: "claimant" | "respondent";
  label: string;
  items: EvidenceItem[];
  canAdd: boolean;
  onChanged: () => void;
}) {
  const { address, connect } = useWallet();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleVerify(index: number) {
    if (!address) return connect();
    setBusyIndex(index);
    setError(null);
    try {
      await writeContract(address, "verify_evidence_url", [disputeId, side, index]);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify evidence");
    } finally {
      setBusyIndex(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return connect();
    setAdding(true);
    setError(null);
    try {
      await writeContract(address, "add_evidence", [disputeId, side, newUrl]);
      setNewUrl("");
      setShowAddForm(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add evidence");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
        {canAdd && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="font-mono text-[10px] text-gold hover:underline"
          >
            {showAddForm ? "cancel" : "+ add evidence"}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-3">
          <input
            required
            placeholder="https://…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 bg-ink border border-line/50 rounded-sm px-2 py-1.5 text-xs text-paper font-mono"
          />
          <button
            type="submit"
            disabled={adding}
            className="font-mono text-xs bg-gold text-ink px-3 py-1.5 rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {adding ? "…" : "Add"}
          </button>
        </form>
      )}

      {items.length === 0 && (
        <p className="text-xs text-muted italic">No evidence submitted.</p>
      )}

      {error && <p className="text-dispute text-xs mb-2">{error}</p>}

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${item.url}-${index}`} className="border border-line/40 rounded-sm p-2.5">
            <div className="flex items-center justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-citation hover:underline break-all"
              >
                {item.url}
              </a>
              <span
                className={`shrink-0 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm border ${
                  STATUS_STYLE[item.status] ?? "text-muted border-muted/60"
                }`}
              >
                {item.status.replace(/_/g, " ")}
              </span>
            </div>

            {item.status === "verified" || item.status === "failed_fetch" ? (
              <div className="mt-1.5 space-y-1 font-mono text-[10px] text-muted">
                <p>http status: {item.http_status || "—"}</p>
                {item.content_hash && (
                  <p className="break-all">sha256: {item.content_hash}</p>
                )}
                {item.evidence_summary && (
                  <p className="text-parchment/80 font-sans text-xs normal-case">
                    {item.evidence_summary}
                  </p>
                )}
                {item.short_quote && (
                  <p className="text-parchment/60 font-sans text-xs normal-case italic">
                    &ldquo;{item.short_quote}&rdquo;
                  </p>
                )}
                {item.verified_at && <p>verified {item.verified_at}</p>}
              </div>
            ) : (
              item.status !== "invalid_url" && (
                <button
                  onClick={() => handleVerify(index)}
                  disabled={busyIndex === index}
                  className="mt-2 font-mono text-[10px] border border-citation/60 text-citation px-2 py-1 rounded-sm hover:bg-citation/10 disabled:opacity-50"
                >
                  {busyIndex === index ? "Verifying…" : "Verify evidence"}
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
