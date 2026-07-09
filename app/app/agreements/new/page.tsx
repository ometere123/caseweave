"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeContract } from "../../../lib/genlayer";
import { useWallet } from "../../../store/useWallet";
import {
  ALLOWED_AGREEMENT_TYPES,
  ALLOWED_PRECEDENT_POLICIES,
} from "../../../lib/contract";

type CreateAgreementReceipt = {
  consensus_data?: {
    leader_receipt?: {
      result?: {
        payload?: {
          readable?: string;
        };
      };
    }[];
  };
};

export default function CreateAgreementPage() {
  const router = useRouter();
  const { address, connect } = useWallet();

  const [title, setTitle] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [agreementType, setAgreementType] = useState<string>(
    ALLOWED_AGREEMENT_TYPES[0]
  );
  const [tags, setTags] = useState("");
  const [stakeAmount, setStakeAmount] = useState("0");
  const [precedentPolicy, setPrecedentPolicy] = useState<string>(
    ALLOWED_PRECEDENT_POLICIES[3]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address) {
      await connect();
      return;
    }

    setSubmitting(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { receipt } = await writeContract(address, "create_agreement", [
        title,
        agreementText,
        counterparty,
        agreementType,
        tagList,
        Number(stakeAmount) || 0,
        precedentPolicy,
      ]);

      const leaderResult = (receipt as CreateAgreementReceipt)?.consensus_data
        ?.leader_receipt?.[0]?.result;
      const agreementId: string | null =
        leaderResult?.payload?.readable?.replace(/"/g, "") ?? null;

      router.push(agreementId ? `/agreements/${agreementId}` : "/agreements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agreement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
        Draft a Legal Instrument
      </p>
      <h1 className="font-display text-3xl text-paper mb-4">Create Agreement</h1>
      <p className="text-sm text-parchment/80 mb-8 leading-relaxed border border-line/40 rounded-sm p-4 bg-charcoal/40">
        Your agreement text becomes the base law for any future dispute. Write
        obligations clearly. Precedent can help later, but it cannot repair a
        vague promise completely.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Agreement title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="DAO Frontend Build Grant"
          />
        </Field>

        <Field label="Agreement type">
          <select
            value={agreementType}
            onChange={(e) => setAgreementType(e.target.value)}
            className="input"
          >
            {ALLOWED_AGREEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Counterparty wallet address">
          <input
            required
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            className="input font-mono"
            placeholder="0x…"
          />
        </Field>

        <Field label="Agreement text">
          <textarea
            required
            rows={8}
            value={agreementText}
            onChange={(e) => setAgreementText(e.target.value)}
            className="input"
            placeholder="The DAO agrees to pay the Builder 1000 GEN for…"
          />
        </Field>

        <Field label="Stake amount (GEN)">
          <input
            type="number"
            min={0}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Precedent policy">
          <select
            value={precedentPolicy}
            onChange={(e) => setPrecedentPolicy(e.target.value)}
            className="input"
          >
            {ALLOWED_PRECEDENT_POLICIES.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags (comma separated)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
            placeholder="frontend, grant, wallet-integration"
          />
        </Field>

        {error && <p className="text-dispute text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-gold text-ink font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting
            ? "Submitting…"
            : address
            ? "Create Agreement"
            : "Connect Wallet to Continue"}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          background: var(--ink-black);
          border: 1px solid rgba(90, 71, 53, 0.5);
          border-radius: 2px;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          color: var(--legal-paper);
        }
        .input:focus {
          outline: none;
          border-color: var(--case-gold);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
