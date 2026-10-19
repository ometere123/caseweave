# Milestone Reviewer Walkthrough

This is the reproducible reviewer path for the completed milestone. It is
intentionally based on real contract calls and reads; a local mock is used only
by Direct Mode tests.

1. Confirm `studionet`, chain `61999`, the committed contract source hash and
   the owner returned by `get_owner()`.
2. Open `/agreements/new`, connect a StudioNet wallet, and submit a structured
   technical agreement. The creation builder passes a runtime
   `CalldataAddress`, not a TypeScript-only cast.
3. Accept as the counterparty, fund the payable escrow, allocate a named
   milestone, submit a commit-pinned proof, and run `verify_delivery_proof`.
   Inspect the returned repository API facts, raw content hash and obligation
   assessment separately.
4. File a performance dispute, submit the response, challenge evidence, resolve
   the challenge, request precedent search, request the consensus verdict and
   finalize the precedent. Inspect the frozen snapshot and judgment version.
5. File a bonded appeal. Attempt the old administrative `resolve_appeal` path
   from an unrelated wallet and compare before/after reads. The call must
   finalize with a GenVM execution error and leave all protected state equal.
6. Request appellate review. Inspect the independent decision, superseded
   original judgment, current judgment and precedent treatment.
7. Consume the current finalized judgment through
   `CaseWeaveJudgmentConsumer`; stale or superseded versions must reject.
8. Reconcile the appeal-bond child transfer and execute the deterministic
   settlement. Confirm the payout only after the child transfer is finalized,
   then inspect `get_transfer`, `get_escrow` and `get_accounting_invariant`.

The final run table below is populated from `test-evidence/studionet-e2e.json`
after the live deployment and contains no fabricated or historical hashes.

| Step | Method / object | Transaction | Explorer | Result |
| --- | --- | --- | --- | --- |
| Deployment | `CaseWeaveCourt` | pending final deployment record | pending | pending live run |
| Consumer deployment | `CaseWeaveJudgmentConsumer` | pending final deployment record | pending | pending live run |
| Agreement-to-settlement workflow | see generated evidence JSON | pending live run | pending | pending live run |
| Unauthorized appeal resolution | `resolve_appeal` | pending live run | pending | expected GenVM rejection |
