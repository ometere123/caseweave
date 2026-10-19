# CaseWeave milestone reviewer evidence

This walkthrough is reproducible against StudioNet chain 61999. The canonical
machine-readable record is
[test-evidence/studionet-e2e.json](test-evidence/studionet-e2e.json), and the
complete 24-transaction table is in [DEPLOYMENT.md](DEPLOYMENT.md). No mock
receipt or fabricated object ID is used in the live evidence.

## Final deployed artifacts

- CaseWeaveCourt: 0xBcD6A69Ca192528C65C67417BfE2dB7c2369215a
- CaseWeaveJudgmentConsumer: 0x8e7C58fECA7E5F3ABf62Fd5df83C415d78BCEf71
- Court deployment: [0x5c80f28523c9129ccd89dda0b6fa4df7fae768ee15cf9e946e90f29e4779aa40](https://explorer-studio.genlayer.com/tx/0x5c80f28523c9129ccd89dda0b6fa4df7fae768ee15cf9e946e90f29e4779aa40)
- Consumer deployment: [0x390d9bf3ad87da7a24a3ba45e5d4320e807088a972437756ef2be5eba495fce3](https://explorer-studio.genlayer.com/tx/0x390d9bf3ad87da7a24a3ba45e5d4320e807088a972437756ef2be5eba495fce3)
- Owner from get_owner(): 0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7
- Court source SHA-256: AD2E8663D1021E163E301557BD5BBCB96AC64FFF77A9B229D05F8FBDDFD3D6D4
- Court deployment source commit: b528a8ed178b417e718116935d30808e54392761

Both deployments were finalized with majority agreement (result=6) and
leader GenVM SUCCESS.

## Reviewer walkthrough

1. Inspect the creation path in app/lib/address.ts and app/lib/contract.ts.
   The builder trims, rejects malformed/zero/self addresses, creates exactly
   20 bytes, and instantiates the SDK runtime CalldataAddress. Frontend tests
   prove the SDK address tag rather than a string tag.
2. On the live run, create_technical_agreement returned AGR_6, and the
   authoritative read stored creator
   0xac3AC69dC0Bde389256dD6748C75817ead9286D9 and counterparty
   0xA7EeAE0E93793e3146Cb14b0700251B8b0EBADFB. The creation transaction is
   [0x8134c17a5341855d16fff7a9de601c2cf89104ead134008fa8c520a8dece9036](https://explorer-studio.genlayer.com/tx/0x8134c17a5341855d16fff7a9de601c2cf89104ead134008fa8c520a8dece9036).
3. accept_agreement, fund_agreement, fund_milestone, submit_deliverable, and
   register_delivery_proof progressed the agreement to a funded technical
   delivery case. The proof is PROOF_6.
4. verify_delivery_proof independently retrieved the committed GitHub
   repository, commit, changed files, PR/deployment facts, and immutable raw
   delivery record. The response contains per-obligation findings and treats
   CI as supporting context rather than proof. Transaction:
   [0x7ed2c3ba7a74d7b0d0c4f995b869f347e1ddb28e6e81b6cf4056c91aeb2b3ff2](https://explorer-studio.genlayer.com/tx/0x7ed2c3ba7a74d7b0d0c4f995b869f347e1ddb28e6e81b6cf4056c91aeb2b3ff2).
5. DIS_5 was filed, answered, challenged, and challenge-resolved. Both
   evidence rails were independently fetched; the respondent counter-evidence
   had HTTP 200 and hash
   7d1cf5c5bf023039b2a7b40fbac09e1c8c543cafb0e568f6996146b3c193b338.
6. request_precedent_search, request_verdict, and finalize_precedent produced
   CASE_3 and first-instance judgment JDG_5. The frozen snapshot is
   SNAPSHOT_DIS_5_9 with hash
   40c361583c6e61d92b9bf2f0299c38e2c3ee133bc9ec18a87b9d2cba54ac9e3c.
7. APP_3 was filed with a one-GEN bond. A third wallet called the legacy
   resolve_appeal method. The transaction finalized with GenVM ERROR and
   rollback payload “only the owner may access the administrative appeal
   guard”; before/after reads were unchanged:
   [0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d](https://explorer-studio.genlayer.com/tx/0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d).
8. The owner could not choose a merits result through that compatibility
   method. The owner submitted request_appeal_review, which independently
   assessed the frozen evidence and produced JDG_6, version 2, result
   affirmed:
   [0xb82b61a6fb224921e9bd140f966ad4aa4f37c715acd35be705f304854a668c96](https://explorer-studio.genlayer.com/tx/0xb82b61a6fb224921e9bd140f966ad4aa4f37c715acd35be705f304854a668c96).
9. The consumer contract accepted only the finalized current judgment and
   recorded AGR_6, DIS_5, CASE_3, JDG_6, version 2:
   [0x949a322a1f1ad6a35622432887b20cba4f9e5dcf5ad6a6c688ae751c8e393304](https://explorer-studio.genlayer.com/tx/0x949a322a1f1ad6a35622432887b20cba4f9e5dcf5ad6a6c688ae751c8e393304).
10. The appeal bond and judgment settlement were released as tracked native
    child transfers and confirmed only after child finality. The two
    confirmation transactions are
    [0xc510a252459b63ae44bc257e3811a27c300ced3e49a2cc5dfedaecbf77c7f499](https://explorer-studio.genlayer.com/tx/0xc510a252459b63ae44bc257e3811a27c300ced3e49a2cc5dfedaecbf77c7f499) and
    [0x29dfadb00f03d66dadb513da3f0d24f5bda8a75b8677ce267358629713320958](https://explorer-studio.genlayer.com/tx/0x29dfadb00f03d66dadb513da3f0d24f5bda8a75b8677ce267358629713320958).

## Final state proof

The final read for AGR_6 is resolved; DIS_5 is finalized; APP_3 is resolved;
CASE_3 is active public precedent; and JDG_6 is the current version 2 judgment
with appellate status closed. Escrow reads show:

    actual_deposited=1001
    available=100
    committed=0
    reserved=0
    pending_transfer=0
    appeal_bond_balance=0
    settled=901
    failed_transfer_balance=0
    contract_balance=5101
    total_accounted_assets=5101
    total_liabilities=5101
    solvent=true

## Reproduce

    $env:GENVM_VERSION='v0.2.16'
    python -m unittest discover -v
    gltest.exe test/test_caseweave_direct.py test/test_caseweave_milestone_direct.py -v -s
    npm run test:frontend
    npm run test:studionet
    $env:PLAYWRIGHT_BASE_URL='https://caseweave.vercel.app'
    npm run test:playwright

The production alias is https://caseweave.vercel.app. Its live agreement
creation bundle contains the final court address and compiled runtime address
conversion; the old court address is not present. Local encrypted keystore
inputs are required for the live harness and are not committed.
