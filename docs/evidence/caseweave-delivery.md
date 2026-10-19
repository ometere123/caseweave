# CaseWeave software-delivery evidence

This commit-pinned artifact is the agreed delivery record for the CaseWeave
autonomous justice milestone.

The delivery is the repository-authenticated CaseWeave application and court
contract. Its acceptance criteria are:

- `contracts/caseweave.py` provides the on-chain agreement, evidence court,
  precedent, appellate, judgment, and funded settlement state machine.
- `app/lib/contract.ts` and the Next.js courtroom workflows construct typed
  GenLayer calldata and point at the current StudioNet deployment.
- The delivery proof is evaluated against the named repository identity and
  immutable commit by the contract's GitHub source adapter; CI status is only
  supporting context and is not proof by itself.

This file is evidence of the committed delivery scope. Validators must still
independently authenticate the repository, commit, changed files, and source
facts before deciding whether the contractual obligation is satisfied.
