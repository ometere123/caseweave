# Milestone Diff

## Baseline

The adversarial remediation starts from main commit
`19d8cf71b2572e4082c82d44a8573b153dcc941d`. That baseline already contained
the eight-capability CaseWeave milestone, runtime `CalldataAddress` encoding,
execution-result checks, a trusted-court consumer, and the first fail-closed
appeal guard. The prior corrected deployment was
`0x99be950790dEec2F474e5F6E55845eF75D8872a0`.

## Before / after security matrix

| Area | Baseline weakness | Final remediation |
| --- | --- | --- |
| Settlement proof | Recipient could submit any 66-character hash; child/parent/value/finality were not proven | `confirm_transfer` is disabled. Court funds enter a one-time configured receiver through an exact-value internal message; the receiver callback binds court, transfer ID, recipient, amount and commitment. EOA withdrawals remain explicitly `withdrawal_submitted` because pinned GenVM cannot query an external receipt. |
| Judgment settlement | Payout recipient/outcome could come from the superseded first-instance case | Settlement resolves the latest finalized judgment and its canonical role/basis-point remedy; affirmed, modified, reversed, weakened and remanded paths are covered. |
| Amounts/refunds | Partial/revision outcomes could pay the full committed pool; residual committed funds had no explicit release path | Canonical remedies require bounded amount basis points. Revision/remand has no payout. A successful partial award has an explicit creator remainder refund; failed transfers reconcile and can retry once without duplicate success. Uncommitted and unallocated funds have tracked refund paths. |
| Evidence challenges | Leader semantic admissibility/credibility/relevance result was not independently checked | Leader and validator independently refetch committed bytes, recompute hashes and compare the complete semantic finding schema before storage changes. |
| Snapshot finality | Evidence could be mutated after freeze and appeal could read moving evidence | Frozen items reject verification, addition and challenges. Appeals validate the stored snapshot hash/payload and read only that snapshot plus separately versioned verified appeal evidence. Pending challenges block verdict/finalization. |
| GitHub authenticity | A raw-file HEAD request showed existence, not membership in the commit | GitHub commit API metadata is fetched and exact full SHA, repository URL and changed-file membership are compared. |
| Consumer trust | Caller supplied an arbitrary court address | Constructor-bound trusted court identity, court-address judgment field, scope/version/current/supersession checks and court-scoped storage keys reject impersonating sources. |
| Regression evidence | Green CI did not cover the adversarial state transitions | 16 Direct Mode behavioral tests, 20 frontend tests, 2 local plus 2 production browser tests, pinned lint/schema checks, build/type/lint gates and a final multi-wallet StudioNet run. |

The immutable source diff is the pushed range
`19d8cf71b2572e4082c82d44a8573b153dcc941d..HEAD`. The final Git commit and
exact `git diff --stat` are reported in the release handoff; the deployed
court source is identified independently by its SHA-256 in `DEPLOYMENT.md`.

No historical deployment is rewritten. Superseded addresses remain labeled as
historical provenance only.
