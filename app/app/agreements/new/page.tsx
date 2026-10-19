"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GenLayerExecutionError,
  getExplorerTxUrl,
  readContract,
  writeContract,
} from "../../../lib/genlayer";
import { resolveCreatedAgreementId } from "../../../lib/create-agreement";
import { useWallet } from "../../../store/useWallet";
import {
  ALLOWED_AGREEMENT_TYPES,
  ALLOWED_PRECEDENT_POLICIES,
  buildCreateTechnicalAgreementArgs,
  type Agreement,
} from "../../../lib/contract";

export default function CreateAgreementPage() {
  const router = useRouter();
  const { address, connect } = useWallet();

  const [title, setTitle] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [obligationText, setObligationText] = useState("");
  const [deliverableDescription, setDeliverableDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("100");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [sourcePolicy] = useState("github_commit_pinned");
  const [completionConditions, setCompletionConditions] = useState("");
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
  const [errorHash, setErrorHash] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorHash(null);

    if (!address) {
      await connect();
      return;
    }

    if (!repositoryUrl.trim() || !acceptanceCriteria.trim() || !obligationText.trim()) {
      setError("Repository, acceptance criteria, and at least one obligation are required.");
      return;
    }

    const displayedAmount = Number(stakeAmount) || 0;
    const fundedMilestoneAmount = Number(milestoneAmount);
    if (!Number.isSafeInteger(fundedMilestoneAmount) || fundedMilestoneAmount < 0) {
      setError("Milestone amount must be a non-negative whole number of GEN.");
      return;
    }

    setSubmitting(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const args = buildCreateTechnicalAgreementArgs({
        creator: address,
        title,
        agreementText,
        counterparty,
        agreementType,
        tags: tagList,
        stakeAmount: displayedAmount,
        precedentPolicy,
        acceptanceCriteria,
        obligations: [{ id: "delivery", text: obligationText }],
        deliverables: [{ id: "primary", description: deliverableDescription }],
        milestones: [
          {
            name: "Primary delivery",
            obligation_id: "delivery",
            acceptance_criteria: acceptanceCriteria,
            deadline: deadline ? new Date(deadline).toISOString() : "2099-01-01T00:00:00Z",
            amount: fundedMilestoneAmount,
          },
        ],
        repositoryUrl: repositoryUrl.trim(),
        sourcePolicy,
        completionConditions: completionConditions.trim() || acceptanceCriteria,
      });
      const { hash, receipt } = await writeContract(
        address,
        "create_technical_agreement",
        args,
      );

      const agreementId = await resolveCreatedAgreementId({
        hash,
        receipt,
        expected: {
          creator: address,
          counterparty,
          title,
          agreementText,
          agreementType,
          tags: tagList,
          stakeAmount: displayedAmount,
          precedentPolicy,
        },
        readAgreement: async (agreementId) =>
          (await readContract("get_agreement", [agreementId])) as Agreement,
        listAgreements: async () =>
          (await readContract("list_agreements")) as Record<string, Agreement>,
      });
      router.push(`/agreements/${agreementId}`);
    } catch (err) {
      if (err instanceof GenLayerExecutionError) {
        setErrorHash(err.hash);
      }
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

        <div className="border border-line/40 rounded-sm p-4 space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-gold">
            Proof-of-performance commitment
          </p>
          <p className="text-xs text-muted leading-relaxed">
            These fields are committed on-chain before acceptance. The source
            repository is later checked against an immutable commit-pinned
            evidence URL; a green CI result is supporting context, not proof by itself.
          </p>
          <Field label="Acceptance criteria">
            <textarea
              required
              rows={3}
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              className="input"
              placeholder="The named commit must contain the agreed deliverable and satisfy the measurable obligation."
            />
          </Field>
          <Field label="Primary obligation">
            <textarea
              required
              rows={2}
              value={obligationText}
              onChange={(e) => setObligationText(e.target.value)}
              className="input"
              placeholder="Deliver the authenticated repository change described by this agreement."
            />
          </Field>
          <Field label="Deliverable description">
            <textarea
              rows={2}
              value={deliverableDescription}
              onChange={(e) => setDeliverableDescription(e.target.value)}
              className="input"
              placeholder="A reviewable source revision, pull request, CI record, and deployment artifact."
            />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Deadline">
              <input
                required
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Milestone allocation (GEN)">
              <input
                required
                type="number"
                min={0}
                step={1}
                value={milestoneAmount}
                onChange={(e) => setMilestoneAmount(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="GitHub repository URL">
            <input
              required
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="input font-mono"
              placeholder="https://github.com/owner/repository"
            />
          </Field>
          <Field label="Completion conditions">
            <textarea
              rows={2}
              value={completionConditions}
              onChange={(e) => setCompletionConditions(e.target.value)}
              className="input"
              placeholder="What must be true before the milestone can be accepted?"
            />
          </Field>
        </div>

        <Field label="Displayed contractual amount (GEN)">
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

        {error && (
          <div className="text-dispute text-sm" role="alert" aria-live="polite">
            <p>{error}</p>
            {errorHash && (
              <a
                href={getExplorerTxUrl(errorHash)}
                target="_blank"
                rel="noreferrer"
                className="text-citation underline"
              >
                View transaction {errorHash}
              </a>
            )}
          </div>
        )}

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
