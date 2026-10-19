# CaseWeave Threat Model

## Assets and invariants

- Agreement commitments, party identities, deadlines and policy are immutable
  after acceptance unless both parties approve a versioned amendment.
- A proof/evidence hash commits fetched bytes, not source truthfulness; source
  identity and repository/commit scope must also verify.
- A verdict snapshot is frozen. Later evidence cannot rewrite the original
  snapshot or judgment.
- Only a current finalized judgment can settle. `total_liabilities` never
  exceeds accounted assets and a pending transfer is idempotently reconciled.
- A consumed judgment must be current, finalized, correctly scoped and at its
  expected version.

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
| Double payout/unsupported recipient | Deterministic recipient selection, one active transfer, committed/reserved balances and recipient-only confirmation |
| Failed child transfer | `__on_errored_message__`, explicit failed status, reconciliation path and no delivered flag before child finality |
| Stale cross-contract judgment | Consumer checks current judgment, status, appeal state, scope, version and supersession |
| Credential leakage | No keys, passwords, keystores or environment secrets are committed; E2E reads encrypted local keystores only |

## Residual limitations

External APIs can be unavailable or rate-limited. CaseWeave fails closed for
irreversible proof, verdict and appellate effects when the required facts do
not reach consensus. A production deployment must monitor child-transfer
statuses and retain the returned explorer evidence; the contract does not
pretend that emitting a transfer is delivery.
