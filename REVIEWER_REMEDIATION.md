# Final adversarial security remediation

## Scope

This release continues the locked CaseWeave milestone from baseline
`19d8cf71b2572e4082c82d44a8573b153dcc941d`. It does not rebuild or expand the
product.

## Findings addressed

### Deadline liveness

Procedure and appeal-window proposals remain bounded, canonical UTC values.
Either party can activate an already validated proposal only after its stored
challenge/deadline has elapsed. The fallback copies the exact proposal and
cannot invent, extend, or shorten a deadline. Direct Mode tests cover early,
late, malformed, expired, long, and uncooperative-party cases.

### Withdrawal recovery safety

Receiver withdrawals are serialized by `active_withdrawal_id`. The receiver
captures a native-balance checkpoint before the EOA child is submitted. An
owner-only reconciliation may reopen only the active record and only when the
balance is unchanged; an owner-supplied hash is retained as audit metadata and
is not treated as cryptographic proof. Trusted court deposits remain accepted
while a withdrawal is pending and are included in the checkpoint. Tests cover
successful-child debit, failed-child recovery, duplicate/replay, callback
ordering, stale locks, concurrent withdrawals, and balance changes.

### Evidence and consumer hardening

Evidence challenge conclusions are independently re-fetched and semantically
validated. Frozen snapshots cannot be mutated; appellate evidence is separately
versioned. GitHub verification checks repository identity, full commit SHA, and
authoritative changed-file membership. The judgment consumer binds the trusted
court and namespaces records by court identity plus judgment ID.

## Deployment

- Network: StudioNet, chain `61999`
- Court: `0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f`
- Receiver: `0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7`
- Consumer: `0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court SHA-256: `3FDDDA6866DA094D6F6055F3520DCC08523E9840B183BB63560B7908AD6D4EA0`
- Receiver SHA-256: `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3`
- Consumer SHA-256: `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8`

Deployment and configuration receipts, source matching, and live transaction
links are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Verification status

Automated local gates passed: 18 pytest tests, 6 unittest tests, 22 Vitest
tests, three contract lint/schema checks, TypeScript, ESLint, production build,
and two local Playwright tests.

The fresh live run completed agreement creation/acceptance/funding, source
authentication, dispute/evidence/challenge consensus, first-instance verdict
and finalization, appellate filing/evidence, and unauthorized resolver
rejection. Five bounded owner appellate-review attempts failed closed with
`MAJORITY_DISAGREE`. Settlement, custody withdrawal, and consumer writes were
not claimed from that run because no appellate judgment was available.

Machine-readable record:
[`test-evidence/studionet-final-release-hardening-e2e-final-20261020.json`](test-evidence/studionet-final-release-hardening-e2e-final-20261020.json).

## Reviewer response

> CaseWeave’s final hardening source is deployed to StudioNet chain 61999. The
> release adds bounded procedural fallback, balance-guarded failed-withdrawal
> recovery, fail-closed transfer confirmation, current-judgment remedy checks,
> immutable evidence snapshots, authoritative GitHub changed-file validation,
> semantic challenge checks, and trusted-court judgment consumption. Local
> behavioral and frontend gates pass. A fresh live run created and finalized a
> first-instance case, verified commit-pinned evidence, and rejected an
> unrelated appeal resolver without state change. Appellate consensus then
> failed closed with MAJORITY_DISAGREE on five bounded attempts; no settlement
> or appellate result is being represented as successful. Full receipts,
> hashes, source identities, and the blocker are documented in DEPLOYMENT.md
> and TEST_EVIDENCE.md.
