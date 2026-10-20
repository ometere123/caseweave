# CaseWeave Autonomous Contract Justice Protocol

This document locks the completed milestone scope for the existing CaseWeave
application. It is an implementation specification, not a future-feature list.

## Runtime

- GenLayer StudioNet, chain ID `61999`
- RPC `https://studio.genlayer.com/api`
- repository-local GenLayer CLI `0.39.1`
- `genlayer-js@1.1.8`
- `genvm-linter==0.11.0`
- compatible runner `GENVM_VERSION=v0.2.16`
- contract source `contracts/caseweave.py`
- consumer source `contracts/caseweave_judgment_consumer.py`

## On-chain architecture

`CaseWeaveCourt` stores the bilateral agreement commitment, bounded milestone
specification, authenticated delivery proofs, versioned evidence metadata and
challenges, precedent cases/treatments/conflicts, judgment versions, appeals,
escrow accounts, and child-transfer reconciliation records.

The delivery path is:

`pending_acceptance → active → disputed → awaiting_response → awaiting_precedent_search → awaiting_verdict → verdict_reached → finalized`.

Appeal filing changes a finalized dispute to `under_appeal`; only
`request_appeal_review` can create a merits decision, and it must pass the
leader/validator structured consensus check. The compatibility method
`resolve_appeal` is deliberately a fail-closed guard and cannot choose a
merits result.

## Capability boundaries

1. Proof-of-performance commits acceptance criteria, obligations, deliverables,
   deadlines, repository identity, source policy and milestone amounts. GitHub
   commit facts are fetched from the repository API, raw evidence is fetched
   and hashed, and the validator assessment returns one bounded finding per
   obligation.
2. The evidence court stores provenance, source adapter, content commitment,
   claim mapping, snapshot/version and every challenge. A hash proves fetched
   bytes; it does not prove that a source is truthful. Evidence is frozen in a
   verdict snapshot and later challenges preserve the original record.
3. Nondeterministic blocks do not write state. Validators independently fetch
   source facts and compare identities, hashes, IDs, schema fields, material
   categories and affected precedent IDs before deterministic writes.
4. Agreement policy is committed at acceptance. `strict_following` requires
   eligible relevant cases to be followed or distinguished and forbids initial
   weakening/overturning; `persuasive_only` records treatments without mutating
   old cases; `no_overturn_without_appeal` forbids initial overturning;
   `fresh_review_allowed` permits a fresh first-instance review;
   `private_precedent` limits candidate visibility to the agreement;
   `public_precedent` exposes the case to other matching agreements.
5. Appeals preserve the original judgment, create an immutable replacement
   judgment version, and support affirmed, modified, reversed, weakened,
   overturned and remanded results. Administrative ownership cannot override
   the consensus result.
6. Native GEN deposits, milestone commitments, appeal bonds, pending child
   transfers and settled balances are separately accounted. Solvency is checked
   before payout. Court settlement is considered custodied only after the
   configured receiver accepts the exact parent transfer fields and sends a
   finalized protocol callback; a beneficiary EOA withdrawal remains
   `withdrawal_submitted` and stores an externally observed child hash because
   the pinned GenVM runtime cannot query an external receipt. Failed value
   children restore custody only through `__on_errored_message__`; no caller
   supplied hash can mark a court transfer delivered.
7. `CaseWeaveJudgmentConsumer` consumes only the current, finalized, correctly
   scoped judgment with the expected version and evidence snapshot. Superseded,
   unresolved or stale judgments are rejected.
8. The existing Next.js courtroom exposes structured agreement creation,
   acceptance, funding, milestone proof, evidence/challenge flows, precedent,
   verdicts, appeals, judgment versions, settlement state, child transfers and
   explorer links without simulating receipts or settlement.

All arrays, text, source bodies, candidate cases, and challenge counts are
bounded. External content is treated as untrusted data and never as contract
instructions.
