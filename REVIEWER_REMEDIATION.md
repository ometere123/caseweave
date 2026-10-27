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

## Historical deployment and superseding closeout

The addresses in this historical remediation record are retained for audit
provenance only. The successful appellate closeout is now deployed on
StudioNet chain `61999` at:

- Court: `0x1FB9cA025916AA57A0bC221346cBD913282a5417`
- Receiver: `0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D`
- Consumer: `0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court SHA-256: `A453AC58196191D26AD7ECB86FAF042B590FC5489968CDBC81D5EE96C14D8278`
- Receiver SHA-256: `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3`
- Consumer SHA-256: `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8`

The deployed contract source is commit
[`645208b7eaa2a1efdc2c296f784b26f89d7a635e`](https://github.com/ometere123/caseweave/commit/645208b7eaa2a1efdc2c296f784b26f89d7a635e).
Deployment/configuration receipts, source matching, and the complete fresh
live transaction sequence are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Verification status

Automated local gates passed: 20 pytest tests, 14 Direct Mode tests, 6
unittest tests, 22 Vitest tests, three contract lint/schema checks, TypeScript,
ESLint, production build, and two local Playwright tests.

The fresh final-address run completed agreement creation/acceptance/funding,
source authentication, dispute/evidence/challenge consensus, first-instance
verdict and finalization, appellate filing/evidence, unauthorized resolver
rejection, successful `MAJORITY_AGREE` appellate consensus, `JDG_2` creation,
trusted settlement custody, beneficiary withdrawal submission, and current
judgment consumption. The canonical record is
[`test-evidence/studionet-final-appellate-remediation-20261027.json`](test-evidence/studionet-final-appellate-remediation-20261027.json).

## Reviewer response

> CaseWeave’s corrected source is deployed to StudioNet chain 61999. The
> release preserves bounded procedural fallback, balance-guarded failed-
> withdrawal recovery, fail-closed transfer confirmation, current-judgment
> remedy checks, immutable evidence snapshots, authoritative GitHub
> changed-file validation, semantic challenge checks, and trusted-court
> judgment consumption. A fresh live run reached successful appellate
> `MAJORITY_AGREE`, created replacement `JDG_2`, settled 900 GEN into trusted
> custody, finalized the beneficiary withdrawal child, and stored `JDG_2` in
> the trusted consumer. Full receipts, hashes, state reads, and the explicit
> external-EOA finality boundary are documented in DEPLOYMENT.md and
> TEST_EVIDENCE.md.
