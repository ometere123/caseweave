# Project History

CaseWeave has been developed as one project through several focused
iterations. This file exists to make that progression easy to audit.

## v1 - First Working Court

- Implemented the original `CaseWeaveCourt` intelligent contract.
- Added agreements, disputes, verdicts, and basic precedent creation.
- Stored lifecycle data on GenLayer contract storage.
- Limitation: early timestamp fields were placeholder values.

Superseded deployment:
`0xec393236E39578d19081687f2F27d801212f8194`.

## v2 - Deterministic Timestamps

- Replaced placeholder or local timestamps with `gl.message_raw["datetime"]`.
- Made agreement, dispute, appeal, evidence, and precedent timestamps
  transaction-pinned and validator-consistent.
- Added frontend sorting and filtering support that depends on real case dates.
- Limitation: evidence URLs were still passed into prompts as raw strings.

Superseded deployment:
`0xCdB3EDb59f582bdbDcf6fe153ed79E7b5290dc49`.

## v3 - Verified Evidence And Verdict Gating

- Added `EvidenceItem` storage with status, HTTP status, content hash, summary,
  quote, verification time, and verification sequence.
- Added `verify_evidence_url`, which uses `gl.nondet.web.request` to fetch
  evidence from the contract, hashes the fetched body, and reaches validator
  consensus on objective fetch results and meaning-equivalent summaries.
- Added URL shape validation for `https://`, localhost, private-IP hosts, and
  maximum URL length.
- Changed `request_verdict` so it requires at least one verified evidence item
  before validators can decide a dispute.
- Updated the verdict prompt to weight verified, unverified, invalid, and
  failed evidence differently.

Superseded remediation deployment:
`0x99be950790dEec2F474e5F6E55845eF75D8872a0`.

## Frontend Iterations

- Built the agreement docket and agreement chamber.
- Added the dispute courtroom with claimant/respondent briefs, evidence rails,
  precedent bench, verdict panel, and finalization flow.
- Added case memory views, treatment badges, precedent strength display,
  citation graph, appeal docket, and wallet-aware profile surfaces.
- Replaced the stock Next.js README with CaseWeave-specific run and route docs.

## v4/v5 - Autonomous Contract Justice Protocol milestone

Baseline main commit:
`ff4df65945c068d0d3690aea8f2b256abcbbd290`.

The completed milestone adds the eight integrated capability areas described
in [MILESTONE_SPEC.md](MILESTONE_SPEC.md): structured proof-of-performance
commitments; authenticated GitHub/raw evidence and immutable challenges;
substantive fail-closed validator checks; binding precedent policy and
versioned lineage; consensus appellate review; native GEN escrow and child
transfer reconciliation; the CaseWeaveJudgmentConsumer; and a complete
wallet-connected courtroom/audit UX.

The final court deployment is
`0xBcD6A69Ca192528C65C67417BfE2dB7c2369215a`, with source commit
`b528a8ed178b417e718116935d30808e54392761` and source SHA-256
`AD2E8663D1021E163E301557BD5BBCB96AC64FFF77A9B229D05F8FBDDFD3D6D4`.
The second Intelligent Contract is
`0x8e7C58fECA7E5F3ABf62Fd5df83C415d78BCEf71`.

The live StudioNet run created AGR_6, PROOF_6, DIS_5, CASE_3, APP_3, and
judgment JDG_6 through evidence retrieval, challenge resolution, precedent
search, first-instance consensus, independent appellate consensus, judgment
consumption, native child transfers, and final settlement. See
[DEPLOYMENT.md](DEPLOYMENT.md) and
[MILESTONE_REVIEW_EVIDENCE.md](MILESTONE_REVIEW_EVIDENCE.md) for the
immutable receipts and state reads.
