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

Current deployment:
`0x322b999682CdDecE9b7e704541F86dC86D18D35a`.

## Frontend Iterations

- Built the agreement docket and agreement chamber.
- Added the dispute courtroom with claimant/respondent briefs, evidence rails,
  precedent bench, verdict panel, and finalization flow.
- Added case memory views, treatment badges, precedent strength display,
  citation graph, appeal docket, and wallet-aware profile surfaces.
- Replaced the stock Next.js README with CaseWeave-specific run and route docs.

## Current Focus

- Prove the project depth with clearer documentation, repeatable demo steps,
  and regression tests around the contract guardrails.
- Keep future iterations centered on the same product instead of spinning up
  unrelated demos.
