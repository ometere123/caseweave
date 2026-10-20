# Final adversarial security remediation

## Scope and baseline

This release addresses the independent audit blockers found at
`19d8cf71b2572e4082c82d44a8573b153dcc941d`. It preserves the locked
CaseWeave milestone and does not replace the application.

## Findings and fixes

### 1. Transfer-confirmation authenticity

The old `confirm_transfer` trusted a syntactically valid caller-supplied child
hash. It is now permanently fail-closed. Court payouts and appeal-bond
returns go to a configured `CaseWeaveSettlementReceiver` using an exact-value
internal message containing transfer ID, beneficiary, amount, and a court-side
proof commitment. The receiver accepts the callback only from the configured
court, binds every field exactly, and callbacks the court only after its own
custody transition. A child EOA withdrawal is reported as
`withdrawal_submitted`; an owner-supplied hash can record an observed child
but cannot mark the court transfer paid. Failed receiver messages restore
custody/accounting through the explicit failure callback.

The live run rejected fabricated hashes for both the appeal bond and the
900-GEN judgment transfer, and the before/after transfer reads were equal.

### 2. Appellate settlement correctness

`settle_judgment` resolves the latest finalized judgment for the dispute and
passes its canonical role/basis-point remedy through deterministic checks. It
cannot pay from the superseded first-instance outcome. Direct tests cover
affirmed, modified/reversed replacement judgments, remand locking, stale
judgment rejection, and exact recipient/amount selection. The live run settled
the current `JDG_2` remedy for exactly 900 GEN.

### 3. Bounded amounts and refunds

The remedy schema is canonical: full release/refund is 10000 basis points;
partial release is 1–9999 basis points; all non-payout outcomes are zero.
Partial settlement leaves an explicit creator-controlled remainder refund.
Resolved agreements reject late funding and late milestone commitment.
Unallocated deposits, failed transfers, and retries use separately accounted
balances; duplicate settlement is rejected. The live final invariant was
`total_accounted_assets=100`, `total_liabilities=100`, `solvent=true`.

### 4. Evidence-challenge consensus

`resolve_evidence_challenge` independently refetches committed original and
counter-evidence, recomputes hashes, and compares finding, authenticity,
relevance, credibility, identities, and hashes. Direct malicious-leader tests
show unsupported semantic conclusions fail without state mutation.

### 5. Frozen evidence and procedural finality

Frozen evidence rejects verification, mutation, and challenges. Pending
challenges block verdict and finalization. The verdict snapshot now includes
the authenticated delivery-proof facts and its commitment hash. Appellate
review reads that exact frozen snapshot plus separately versioned verified
appeal evidence. Settlement requires a finalized, closed current judgment;
there is no post-payment appeal reversal path.

### 6. GitHub source authenticity

Delivery verification fetches the authoritative GitHub commit API, validates
the full commit SHA and repository identity, and compares exact
`files[].filename` membership against the committed scope. The raw-file URL is
only the content whose bytes are hashed; it is not treated as proof of commit
membership. Unchanged-file substitution is covered by Direct Mode tests.

### 7. Judgment-consumer trust

The consumer binds the trusted court once in its constructor. `consume_judgment`
requires the court address inside the judgment, current finalized status,
agreement/dispute scope, version, and supersession invariants. Storage keys are
namespaced by court identity and judgment ID; arbitrary caller-supplied court
addresses cannot impersonate the court.

## Final deployment

- Network: `studionet`, chain `61999`
- Court: `0x3BA8098653902c5A5daf08f26A3759fB06C57a2A`
- Receiver: `0x0F77E10770e5a12C0d2f9Bcc5fB077F44eA4257f`
- Consumer: `0x08f0eeAFDd4Cf9ba9CD369AB2fCb25451db83211`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court deploy: [0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef](https://explorer-studio.genlayer.com/tx/0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef)
- Court source SHA-256: `4793E610064B36E68BFE551D1C06A2E7B26ECBDE174CE94066ABD065E8EF08F8`
- Receiver deploy: [0x187c4554707c4ed3c7dc13191ff35e07be725aeb4a13ad4351cad00cb27bf866](https://explorer-studio.genlayer.com/tx/0x187c4554707c4ed3c7dc13191ff35e07be725aeb4a13ad4351cad00cb27bf866)
- Consumer deploy: [0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805](https://explorer-studio.genlayer.com/tx/0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805)

All deployment and configuration receipts were final with GenVM `SUCCESS`;
the deployment script compared receipt code hashes to the committed source
bytes.

## Test and live proof

- Direct Mode: **16 passed, 0 failed**.
- Frontend Vitest: **20 passed, 0 failed**.
- TypeScript, ESLint, production build: **passed**.
- Playwright local/production critical workflows: **2 passed each**.
- StudioNet: **1 test passed, 32 finalized transactions**.

Canonical evidence:
[live JSON](test-evidence/studionet-remediation-final-20261020.json),
[full transaction table](DEPLOYMENT.md), and
[reviewer walkthrough](MILESTONE_REVIEW_EVIDENCE.md).

The live run created `AGR_1`, `PROOF_1`, `DIS_1`, `CASE_1`, `APP_1`, and
`JDG_2`; verified commit-pinned evidence; resolved a challenge; produced an
AI-consensus verdict; performed independent appellate consensus; consumed the
final judgment from the second contract; reconciled trusted custody; and
rejected unauthorized appeal mutation, fabricated child hashes, and duplicate
settlement. Production target is <https://caseweave.vercel.app>; its final
deployment must be independently checked after the release push.

## Reviewer resubmission response

> CaseWeave’s final adversarial remediation is deployed to StudioNet chain
> 61999. Fake child-hash confirmations are disabled; payouts require the
> configured receiver’s exact-value custody callback and finalized child
> evidence. Settlement uses the current appellate judgment and bounded remedy,
> late funding is rejected, evidence snapshots are immutable, GitHub changed
> files are checked through authoritative commit metadata, and the judgment
> consumer is court-bound. A real run created AGR_1/PROOF_1/DIS_1/CASE_1/APP_1,
> produced JDG_2 through appellate consensus, consumed it cross-contract, and
> reconciled 900 GEN custody. Unauthorized appeal mutation, fake hashes, and
> duplicate settlement all failed with unchanged state. Full receipts, hashes,
> state reads, and source SHA-256 are in DEPLOYMENT.md and the machine-readable
> StudioNet evidence record.
