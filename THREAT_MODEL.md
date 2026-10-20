# CaseWeave Threat Model

## Assets and invariants

- Agreement commitments, party identities, deadlines and policy are immutable
  after acceptance unless both parties approve a versioned amendment.
- A proof/evidence hash commits fetched bytes, not source truthfulness; source
  identity and repository/commit scope must also verify.
- A verdict snapshot is frozen. Later evidence cannot rewrite the original
  snapshot or judgment.
- Only a current finalized judgment after the appeal window can settle.
  `total_liabilities` never exceeds accounted assets; pending protocol
  transfers are idempotently reconciled and failed committed transfers can be
  retried without creating a second successful settlement.
- A consumed judgment must be current, finalized, correctly scoped and at its
  expected version.
- Procedure deadlines are canonical UTC timestamps, bounded to 7/14/30 days,
  and become effective only after exact bilateral acceptance. Appeal filing and
  settlement require the accepted procedure and a closed appeal window.
- Court-to-receiver custody is a distinct finality stage from beneficiary EOA
  withdrawal. The court callback proves the configured receiver accepted the
  exact transfer commitment; it does not assert external EOA receipt delivery.

## Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Plain string used for an `Address` parameter | Runtime `CalldataAddress` conversion with 20-byte validation and serialization tests |
| Forged repository, commit or changed-file claim | Canonical GitHub identity checks plus independent GitHub commit API retrieval and exact SHA/file comparison |
| Green CI badge treated as proof | CI is supporting context only; objective source facts and obligation findings are required |
| Prompt injection in fetched content | Content is labeled untrusted in every prompt; source adapters and deterministic schema checks bound what can affect state |
| Unsafe/private/oversized/unstable source | HTTPS allowlist, private-host rejection, bounded URLs/bodies and fail-closed verification |
| Stale or swapped evidence/case/party | Exact evidence keys, snapshot IDs, agreement/dispute/case IDs and content hashes are compared by validators |
| Malicious leader fabricates a verdict or appeal result | Validator independently re-fetches and assesses; full schema and semantic IDs must match |
| Unauthorized appeal resolution | `resolve_appeal` cannot resolve merits for any caller; only appellate consensus changes judgment/case state |
| Duplicate/concurrent dispute or appeal | Active dispute and pending appeal state gates, current judgment checks and duplicate-resolution guards |
| Policy weakening or unauthorized precedent mutation | Committed policy checks, bounded candidates, conflict detection, immutable treatments and case history |
| Double payout/unsupported recipient | Current-judgment remedy resolution, role-bound recipients, one settlement/refund record per judgment, one active transfer, committed/reserved balances and receiver-only custody callback |
| Fake or unrelated child hash | `confirm_transfer` always reverts. Court custody is confirmed only by the configured receiver, which echoes transfer ID, receiver, beneficiary, amount and commitment; EOA withdrawal hashes never change court accounting |
| Failed child transfer | Registered `__on_errored_message__` restores the receiver record; the court has explicit failed/reconciled accounting and retry semantics, with no owner method that can reopen a withdrawal from an asserted hash |
| Concurrent receiver withdrawals | `active_withdrawal_id` serializes beneficiary child transfers. A second custody record cannot overwrite the lock, and the error callback can only restore the record named by the active lock |
| Unilateral deadline extension | Strict `YYYY-MM-DDTHH:MM:SSZ` parsing, UTC calendar validation, minimum delay, bounded maxima, bilateral exact-value acceptance, and immutable post-acceptance procedure state |
| Late deposits or trapped refunds | Active agreements accept only creator funding; resolved agreements reject late agreement funding. Plain-value deposits use an address-keyed unallocated ledger and both available/unallocated balances have tracked custody refunds |
| Superseded or overbroad remedy | Settlement reads the latest finalized judgment and validates its role-bound basis-point remedy. Revision/remand has no payable remedy; partial awards pay only the authorized fraction and expose a separate remainder refund |
| Stale cross-contract judgment | Consumer checks current judgment, status, appeal state, scope, version and supersession |
| Credential leakage | No keys, passwords, keystores or environment secrets are committed; E2E reads encrypted local keystores only |

## Residual limitations

External APIs can be unavailable or rate-limited. CaseWeave fails closed for
irreversible proof, verdict and appellate effects when the required facts do
not reach consensus; a live StudioNet run observed and recorded one such
`MAJORITY_DISAGREE` evidence attempt without a state change. The pinned GenVM
runtime does not expose an in-contract receipt query for a transfer from the
custody receiver to an external EOA.
The receiver therefore records `withdrawal_submitted` and an owner-released,
externally inspected child hash only as operational audit data; it never turns
that observation into court settlement proof. A failed child is restored by
the runtime error callback, and production monitoring must retain the child
receipt and explorer evidence.
