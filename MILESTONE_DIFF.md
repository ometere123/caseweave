# Milestone Diff

## Baseline

The starting point was main commit
`ff4df65945c068d0d3690aea8f2b256abcbbd290`, with the corrected address
serialization, fail-closed transaction execution handling, and the first
authorized appeal guard already present. The prior corrected deployment was
`0x99be950790dEec2F474e5F6E55845eF75D8872a0`.

## Before / after capability matrix

| Area | Baseline | Milestone implementation |
| --- | --- | --- |
| Agreement | Free-form agreement and typed counterparty | Structured acceptance criteria, obligations, deliverables, immutable repository/source commitments and named funded milestones |
| Evidence | URL records with verification hash | Allowlisted adapters, source identity, API commit facts, content commitments, snapshots, versioning, challenges and counter-evidence |
| Consensus | Verdict and precedent category validation | Independent source retrieval, complete structured proof/appellate schemas, strict identity/scope checks and fail-closed semantic validation |
| Precedent | Treatment graph with limited policy guards | Bilateral policy commitment, bounded eligibility, deterministic ordering, conflicts, case versions, history and supersession |
| Appeals | Administrative compatibility method | Compatibility method cannot decide merits; substantive appellate consensus creates immutable judgment versions |
| Escrow | Displayed stake only | Payable GEN deposits, milestone commitment, appeal-bond custody/return, deterministic payouts, child transfer tracking and failed-transfer reconciliation |
| Interoperability | No consumer contract | `CaseWeaveJudgmentConsumer` rejects stale, superseded, unresolved or mis-scoped judgments |
| Frontend | Agreement/dispute/case views | Structured technical agreement flow, funding/proof forms, challenge/appeal/settlement controls, audit links and payment reconciliation |
| Verification | Direct tests and frontend unit tests | Direct behavioral/adversarial tests, source-fact mocks, Playwright smoke coverage, pinned lint/schema/build/CI gates and live StudioNet evidence |

The immutable implementation diff is the Git commit recorded in
`DEPLOYMENT.md` after the final deployment. No prior deployment is silently
rewritten; historical addresses remain labeled as superseded.
