# CaseWeave deployment and proof record

This is the release record for the completed Autonomous Contract Justice
Protocol milestone. It records the final StudioNet deployment and the
immutable evidence produced by the live harness; older addresses are retained
only as historical provenance.

## Pinned runtime

- Network: GenLayer `studionet`
- Chain ID: `61999`
- RPC: <https://studio.genlayer.com/api>
- Explorer: <https://explorer-studio.genlayer.com>
- Repository-local GenLayer CLI: `0.39.1`
- `genlayer-js`: `1.1.8`
- `genvm-linter`: `0.11.0`
- Compatible runner: `GENVM_VERSION=v0.2.16`
- Contract source: `contracts/caseweave.py`
- Consumer source: `contracts/caseweave_judgment_consumer.py`

No chain 61997, `studio-dev`, `studio-devnet`, or global CLI was used.

## Final deployment

| Item | Value |
| --- | --- |
| `CaseWeaveCourt` | `0xBcD6A69Ca192528C65C67417BfE2dB7c2369215a` |
| Court deployment transaction | [0x5c80f28523c9129ccd89dda0b6fa4df7fae768ee15cf9e946e90f29e4779aa40](https://explorer-studio.genlayer.com/tx/0x5c80f28523c9129ccd89dda0b6fa4df7fae768ee15cf9e946e90f29e4779aa40) |
| Court deployment result | `FINALIZED`, majority agree (`result=6`), leader GenVM `SUCCESS` |
| Owner from `get_owner()` | `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7` |
| Deployed source commit | `b528a8ed178b417e718116935d30808e54392761` |
| Deployed `caseweave.py` SHA-256 | `AD2E8663D1021E163E301557BD5BBCB96AC64FFF77A9B229D05F8FBDDFD3D6D4` |
| `CaseWeaveJudgmentConsumer` | `0x8e7C58fECA7E5F3ABf62Fd5df83C415d78BCEf71` |
| Consumer deployment transaction | [0x390d9bf3ad87da7a24a3ba45e5d4320e807088a972437756ef2be5eba495fce3](https://explorer-studio.genlayer.com/tx/0x390d9bf3ad87da7a24a3ba45e5d4320e807088a972437756ef2be5eba495fce3) |
| Consumer deployment result | `FINALIZED`, majority agree (`result=6`), leader GenVM `SUCCESS` |

The committed frontend defaults in `app/lib/contract.ts` and `.env.example`
point to the court above, with chain ID `61999`. The consumer address is
configured for the programmable-judgment demonstration.

The court source hash was calculated from the exact source committed at
`b528a8ed178b417e718116935d30808e54392761` before deployment. There is no
owner-transfer method. `resolve_appeal` is retained only as a fail-closed
compatibility guard; merits changes require the validator-consensus
`request_appeal_review` path.

## Production frontend

- Alias: <https://caseweave.vercel.app>
- Production deployment: <https://vercel.com/delealufejoel-4184s-projects/caseweave/A8jyP2vXbyAzFjmcmJjJgUz7KfeL>
- Deployment ID: `dpl_A8jyP2vXbyAzFjmcmJjJgUz7KfeL`
- Deployment URL: <https://caseweave-eeyp6dsni-delealufejoel-4184s-projects.vercel.app>
- Vercel result: `READY`, production alias assigned
- Production variables verified: `NEXT_PUBLIC_STUDIONET_CHAIN_ID=61999` and both public court-address variables set to `0xBcD6A69Ca192528C65C67417BfE2dB7c2369215a`.
- Live `/agreements/new` returned HTTP 200. Its client bundle contains the final court address, strict 20-byte validation, and the compiled `Uint8Array.from({length:20,...})` runtime address construction. The superseded court address is absent.
- Live Playwright smoke test: `1 passed` against the production alias.

## Historical deployments

These addresses are not active frontend targets:

- `0x99be950790dEec2F474e5F6E55845eF75D8872a0` — prior corrected remediation deployment; superseded by the milestone court above.
- `0xCdB3EDb59f582bdbDcf6fe153ed79E7b5290dc49` — v2 evidence predecessor.
- `0xec393236E39578d19081687f2F27d801212f8194` — v1 deployment.
- `0x322b999682CdDecE9b7e704541F86dC86D18D35a` — vulnerable remediation target; retained only for provenance.

GenLayer has no in-place upgrade in this setup. A storage/schema change
requires a new deployment and a new evidence run.

## Canonical live evidence

The complete machine-readable record is
[`test-evidence/studionet-e2e.json`](test-evidence/studionet-e2e.json). It was
produced by `test/frontend/studionet_e2e.test.ts` using two StudioNet party
wallets, the court owner, and a third unrelated wallet. It contains 24
finality-checked application/consumer transactions, object IDs, before/after
reads, child transfer hashes, consensus status, and GenVM execution results.

Evidence inputs were immutable commit-pinned files:

- Delivery record: <https://raw.githubusercontent.com/ometere123/caseweave/2664f0b94bc80b2b63fbdd2ba9dab62b98cc4698/docs/evidence/caseweave-delivery.md>
- Counter-evidence: <https://raw.githubusercontent.com/ometere123/caseweave/2664f0b94bc80b2b63fbdd2ba9dab62b98cc4698/docs/evidence/caseweave-counter-facts.txt>
- Counter-evidence fetched hash: `7d1cf5c5bf023039b2a7b40fbac09e1c8c543cafb0e568f6996146b3c193b338`
- Delivery-proof fetched hash: `5de3bdd4196f90a42fa984d696adc2a9d0efb4fccd29a57799fe7c874ad5ca09`

The live objects were `AGR_6`, `PROOF_6`, `DIS_5`, `CASE_3`, `APP_3`, and
current judgment `JDG_6` (version 2). The final judgment is `revision_required`
with appellate result `affirmed`; the precedent is active and the dispute is
finalized.

## Full successful agreement-to-judgment sequence

Every row below is `FINALIZED` with GenVM `SUCCESS`, except the explicitly
expected unauthorized rejection row. The linked JSON contains the complete
receipt fields and state snapshots.

| # | Method / object | Transaction |
| ---: | --- | --- |
| 1 | `create_technical_agreement` → `AGR_6` | [0x8134c17a5341855d16fff7a9de601c2cf89104ead134008fa8c520a8dece9036](https://explorer-studio.genlayer.com/tx/0x8134c17a5341855d16fff7a9de601c2cf89104ead134008fa8c520a8dece9036) |
| 2 | `accept_agreement` → `AGR_6 active` | [0x7705c9c3fe6cb3655baaaffb2684657446a5551fae557cd17659c163544a339d](https://explorer-studio.genlayer.com/tx/0x7705c9c3fe6cb3655baaaffb2684657446a5551fae557cd17659c163544a339d) |
| 3 | `fund_agreement` → 1000 GEN deposited | [0x3623401565f1166fb1d12e21847d12f64596ab69cda5e22b6d67c1995ba4ffac](https://explorer-studio.genlayer.com/tx/0x3623401565f1166fb1d12e21847d12f64596ab69cda5e22b6d67c1995ba4ffac) |
| 4 | `fund_milestone` → `MS_6`, 900 GEN committed | [0x802b52039ccc58d0d65693907680c78e451e1ad85d5297944d69ccfaf1a080a3](https://explorer-studio.genlayer.com/tx/0x802b52039ccc58d0d65693907680c78e451e1ad85d5297944d69ccfaf1a080a3) |
| 5 | `submit_deliverable` | [0x6fcd98ba18c18079a2b6e53cf6d1da41c5d0d4cf32352ea7e35e65703fa75084](https://explorer-studio.genlayer.com/tx/0x6fcd98ba18c18079a2b6e53cf6d1da41c5d0d4cf32352ea7e35e65703fa75084) |
| 6 | `register_delivery_proof` → `PROOF_6` | [0xd2044813d74bc5e6a044a235610d19b74409969f48c4003f8ca0edac45f289a6](https://explorer-studio.genlayer.com/tx/0xd2044813d74bc5e6a044a235610d19b74409969f48c4003f8ca0edac45f289a6) |
| 7 | `verify_delivery_proof` → source facts + obligation findings | [0x7ed2c3ba7a74d7b0d0c4f995b869f347e1ddb28e6e81b6cf4056c91aeb2b3ff2](https://explorer-studio.genlayer.com/tx/0x7ed2c3ba7a74d7b0d0c4f995b869f347e1ddb28e6e81b6cf4056c91aeb2b3ff2) |
| 8 | `file_performance_dispute` → `DIS_5` | [0x4283bf07c87c8080ce62119055ab8750b85bafb3e2be7d556c0d0d7ebf7f42e1](https://explorer-studio.genlayer.com/tx/0x4283bf07c87c8080ce62119055ab8750b85bafb3e2be7d556c0d0d7ebf7f42e1) |
| 9 | `submit_response` | [0x750c33e23d0e1c8fa99757ca28ea3639c6a820f03a74b289494a01a367950d01](https://explorer-studio.genlayer.com/tx/0x750c33e23d0e1c8fa99757ca28ea3639c6a820f03a74b289494a01a367950d01) |
| 10 | `verify_evidence_url` claimant → HTTP 200/hash | [0x418599ed83c01f0d21f282cb77179ee960f6962c73c4793b49c1316fd0ed0141](https://explorer-studio.genlayer.com/tx/0x418599ed83c01f0d21f282cb77179ee960f6962c73c4793b49c1316fd0ed0141) |
| 11 | `challenge_evidence` | [0xd9d3eb2c13d7b0319e3194a42910ad33016ee7cbc8de32a18dad5deeec1e903f](https://explorer-studio.genlayer.com/tx/0xd9d3eb2c13d7b0319e3194a42910ad33016ee7cbc8de32a18dad5deeec1e903f) |
| 12 | `resolve_evidence_challenge` | [0xa88f5839051471ce3a971913e299e193bfd3c1e3309e45eb225ed79c683d410f](https://explorer-studio.genlayer.com/tx/0xa88f5839051471ce3a971913e299e193bfd3c1e3309e45eb225ed79c683d410f) |
| 13 | `verify_evidence_url` respondent counter-evidence → HTTP 200/hash | [0x79238c5966e39961b7e185218fccfd6c75e520f89864e57eb175c4eaa00d7609](https://explorer-studio.genlayer.com/tx/0x79238c5966e39961b7e185218fccfd6c75e520f89864e57eb175c4eaa00d7609) |
| 14 | `request_precedent_search` → CASE_1/CASE_2 candidates | [0x71e01c624fa45e53546892939271e35e7c7c686174f1c3d7dab28681ae3f8243](https://explorer-studio.genlayer.com/tx/0x71e01c624fa45e53546892939271e35e7c7c686174f1c3d7dab28681ae3f8243) |
| 15 | `request_verdict` → `JDG_5`, `revision_required` | [0xd7df024e8ddbebfe889e3be42890e50742bc3d67a8791e24674259d6e99f5c32](https://explorer-studio.genlayer.com/tx/0xd7df024e8ddbebfe889e3be42890e50742bc3d67a8791e24674259d6e99f5c32) |
| 16 | `finalize_precedent` → `CASE_3` | [0x007e33859f844c72283e669d5ffe2ee47cd3da80afb2aaef4d915585714c152f](https://explorer-studio.genlayer.com/tx/0x007e33859f844c72283e669d5ffe2ee47cd3da80afb2aaef4d915585714c152f) |
| 17 | `file_appeal` → `APP_3` | [0xde5f983d890ce24d7f716e687f48e724e5d66d7935457c791d250200e75a3354](https://explorer-studio.genlayer.com/tx/0xde5f983d890ce24d7f716e687f48e724e5d66d7935457c791d250200e75a3354) |
| 18 | unauthorized `resolve_appeal` → unchanged state | [0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d](https://explorer-studio.genlayer.com/tx/0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d) |
| 19 | `request_appeal_review` → `JDG_6`, version 2, `affirmed` | [0xb82b61a6fb224921e9bd140f966ad4aa4f37c715acd35be705f304854a668c96](https://explorer-studio.genlayer.com/tx/0xb82b61a6fb224921e9bd140f966ad4aa4f37c715acd35be705f304854a668c96) |
| 20 | `release_appeal_bond` → `TR_2` | [0xbe6d323c4b1a1cd65442b206678e1bdd791fa7829288a9b4e762147196587bcb](https://explorer-studio.genlayer.com/tx/0xbe6d323c4b1a1cd65442b206678e1bdd791fa7829288a9b4e762147196587bcb) |
| 21 | `confirm_transfer(TR_2)` → delivered | [0xc510a252459b63ae44bc257e3811a27c300ced3e49a2cc5dfedaecbf77c7f499](https://explorer-studio.genlayer.com/tx/0xc510a252459b63ae44bc257e3811a27c300ced3e49a2cc5dfedaecbf77c7f499) |
| 22 | consumer `consume_judgment` → `JDG_6` | [0x949a322a1f1ad6a35622432887b20cba4f9e5dcf5ad6a6c688ae751c8e393304](https://explorer-studio.genlayer.com/tx/0x949a322a1f1ad6a35622432887b20cba4f9e5dcf5ad6a6c688ae751c8e393304) |
| 23 | `settle_judgment` → `TR_3` | [0x01c0838a166617a2a34e7cddf5ded10ffdd26fa82cf41c4f271cb2723ad9be62](https://explorer-studio.genlayer.com/tx/0x01c0838a166617a2a34e7cddf5ded10ffdd26fa82cf41c4f271cb2723ad9be62) |
| 24 | `confirm_transfer(TR_3)` → delivered | [0x29dfadb00f03d66dadb513da3f0d24f5bda8a75b8677ce267358629713320958](https://explorer-studio.genlayer.com/tx/0x29dfadb00f03d66dadb513da3f0d24f5bda8a75b8677ce267358629713320958) |

For row 18, the finalized transaction has GenVM `ERROR`, leader rollback
payload `only the owner may access the administrative appeal guard`, and the
before/after appeal, dispute, precedent, and judgment reads are byte-for-byte
unchanged. This is expected rejection evidence, not a successful write.

## Escrow and judgment final reads

After the final transfer confirmation:

```text
agreement: AGR_6
actual_deposited: 1001 GEN (1000 agreement funding + 1 appeal bond)
available: 100
committed: 0
reserved: 0
pending_transfer: 0
appeal_bond_balance: 0
settled: 901 (900 judgment settlement + 1 bond return)
failed_transfer_balance: 0
contract_balance: 5101
total_accounted_assets: 5101
total_liabilities: 5101
solvent: true
```

The consumer recorded the same authoritative judgment: agreement `AGR_6`,
dispute `DIS_5`, case `CASE_3`, judgment `JDG_6`, version `2`, outcome
`revision_required`, snapshot hash
`40c361583c6e61d92b9bf2f0299c38e2c3ee133bc9ec18a87b9d2cba54ac9e3c`, and the
final court address.

## Reproduction

```powershell
$env:GENVM_VERSION='v0.2.16'
python -m unittest discover -v
gltest.exe test/test_caseweave_direct.py test/test_caseweave_milestone_direct.py -v -s
npm run test:frontend
npm run test:studionet
$env:PLAYWRIGHT_BASE_URL='https://caseweave.vercel.app'
npm run test:playwright
```

The live harness uses encrypted local keystores supplied at runtime; no keys,
passwords, or keystores are part of the repository.
