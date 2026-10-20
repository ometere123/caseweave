# Final release diff

## Comparison anchors

- Locked security-remediation baseline: `19d8cf71b2572e4082c82d44a8573b153dcc941d`
- Engineering handoff observed main: `21063992ffedda2495874ef98b658ddf10f01a4c`
- Final implementation commit: recorded by `git rev-parse HEAD` in the release
  handoff after the final commit and push.

The final diff is limited to deadline liveness, settlement-receiver recovery
safety, bounded live-test retries/evidence handling, active deployment
references, and release documentation. No milestone capability was rebuilt.

## Before / after security matrix

| Area | Before | Final source |
| --- | --- | --- |
| Deadline liveness | One party could leave a validated proposal unaccepted indefinitely | A bounded, previously validated proposal can activate after its own challenge deadline; the fallback copies exact timestamps and cannot extend them |
| Withdrawal recovery | Owner-supplied failure hash could reopen custody without a balance guard | Reconciliation requires the active serialized record and unchanged balance checkpoint; the hash is audit metadata, not cryptographic proof |
| Transfer confirmation | Fabricated child hash was accepted | Manual `confirm_transfer` is fail-closed; court accounting changes only through configured receiver custody callback |
| Appellate settlement | First-instance outcome could drive payout after supersession | Settlement resolves the current finalized judgment and validates its canonical remedy |
| Amounts/refunds | Partial/revision paths could overpay or strand remainder | Basis-point remedies, role-bound recipients, explicit remainder/refund accounting, late-funding rejection and idempotent settlement guards |
| Evidence semantics | Challenge IDs/enums could pass without substantive semantic agreement | Leader and validator independently fetch committed evidence and compare the complete semantic finding schema |
| Snapshot finality | Historical evidence could move after verdict | Frozen snapshot records reject mutation; appellate evidence is separately versioned and verified |
| GitHub authenticity | Raw-file existence did not prove commit membership | Authoritative commit API, exact full SHA, repository scope and changed-file membership are checked |
| Consumer trust | Arbitrary court address could be supplied | Trusted court is constructor-bound and consumed records are namespaced by court identity and judgment ID |

## Evidence boundary

The local gates passed. The fresh StudioNet run proved the first-instance path
and unauthorized appeal rejection on the new contracts, but all five appellate
consensus attempts returned `MAJORITY_DISAGREE`. No claim is made that the live
run reached settlement, withdrawal, or consumer consumption. See
[DEPLOYMENT.md](DEPLOYMENT.md) and [TEST_EVIDENCE.md](TEST_EVIDENCE.md).
