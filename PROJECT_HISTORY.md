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

Adversarial-remediation baseline main commit:
`19d8cf71b2572e4082c82d44a8573b153dcc941d`.

The completed milestone adds the eight integrated capability areas described
in [MILESTONE_SPEC.md](MILESTONE_SPEC.md): structured proof-of-performance
commitments; authenticated GitHub/raw evidence and immutable challenges;
substantive fail-closed validator checks; binding precedent policy and
versioned lineage; consensus appellate review; native GEN escrow and child
transfer reconciliation; the CaseWeaveJudgmentConsumer; and a complete
wallet-connected courtroom/audit UX.

The historical milestone deployment is retained in the deployment record. The
final adversarial-remediation deployment supersedes it with court
`0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f`, custody receiver
`0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7`, and trusted judgment consumer
`0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488`; its source hashes and
configuration transactions are recorded in [DEPLOYMENT.md](DEPLOYMENT.md).

The security release adds independently reconciled custody callbacks, bounded
current-judgment remedies, immutable evidence snapshots and versioned appeal
evidence, authoritative GitHub changed-file checks, semantic evidence-challenge
consensus, and trusted-court identity binding for the consumer. Its fresh
StudioNet run is recorded in `test-evidence/` and the final reviewer evidence
report.

The fresh final-address run created `AGR_2`, `PROOF_1`, `DIS_1`, `CASE_1`,
`JDG_1`, and `APP_1`; it recorded 32 finalized application transactions,
including an expected unauthorized-resolver rejection. The five bounded
appellate requests failed closed with `MAJORITY_DISAGREE`, so no `JDG_2`,
settlement, or consumer write is claimed from that run. The final court source
SHA-256 is
`3FDDDA6866DA094D6F6055F3520DCC08523E9840B183BB63560B7908AD6D4EA0`.
