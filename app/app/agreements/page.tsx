"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "../../lib/genlayer";
import type { Agreement } from "../../lib/contract";
import { AgreementFolderCard } from "../../components/AgreementFolderCard";

export default function AgreementsDocketPage() {
  const [agreements, setAgreements] = useState<Record<string, Agreement> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readContract("list_agreements")
      .then((res) => setAgreements(res as Record<string, Agreement>))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const entries = agreements ? Object.values(agreements) : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-2">
            Agreement Docket
          </p>
          <h1 className="font-display text-3xl text-paper">Active Agreements</h1>
        </div>
        <Link
          href="/agreements/new"
          className="bg-gold text-ink font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
        >
          + New Agreement
        </Link>
      </div>

      {error && <p className="text-dispute text-sm mb-4">{error}</p>}

      {agreements === null && !error && (
        <p className="text-muted text-sm">Loading docket…</p>
      )}

      {agreements !== null && entries.length === 0 && (
        <p className="text-muted text-sm italic">
          No agreements yet. Create the first one to begin.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((agreement) => (
          <AgreementFolderCard key={agreement.agreement_id} agreement={agreement} />
        ))}
      </div>
    </div>
  );
}
