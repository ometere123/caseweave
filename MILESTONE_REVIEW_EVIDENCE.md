# CaseWeave reviewer walkthrough — final appellate closeout

This walkthrough is tied to the active StudioNet deployment on chain `61999`
and the machine-readable record
[`test-evidence/studionet-final-appellate-remediation-20261027.json`](test-evidence/studionet-final-appellate-remediation-20261027.json).
It is intended to be independently reproducible from the explorer links and
the committed source.

## Deployed artifacts

- Court: `0x1FB9cA025916AA57A0bC221346cBD913282a5417`
- Receiver: `0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D`
- Judgment consumer: `0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court SHA-256: `A453AC58196191D26AD7ECB86FAF042B590FC5489968CDBC81D5EE96C14D8278`
- Receiver SHA-256: `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3`
- Consumer SHA-256: `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8`
- Source commit for deployed contracts: [`645208b`](https://github.com/ometere123/caseweave/commit/645208b7eaa2a1efdc2c296f784b26f89d7a635e)

Deployment receipts and all lifecycle links are in
[DEPLOYMENT.md](DEPLOYMENT.md).

## Reproducible walkthrough

1. `create_technical_agreement` created `AGR_1` using the frontend's runtime
   `CalldataAddress` conversion. On-chain reads matched creator and
   counterparty. The agreement was accepted and funded with 1000 GEN.
2. A 900 GEN milestone was committed, the deliverable was registered, and
   commit-pinned GitHub evidence was independently fetched. The source adapter
   checked repository identity, full commit SHA, and actual changed-file
   membership; it did not treat a HEAD response or green CI alone as proof.
3. `DIS_1` was filed, answered, and challenged. Counter-evidence was fetched
   and the challenge was resolved through substantive validator output.
4. Precedent search and first-instance verdict consensus produced `CASE_1` and
   `JDG_1` with a frozen evidence snapshot.
5. `APP_1` was filed with a one-GEN bond and separately versioned appellate
   evidence. The unrelated resolver attempt returned GenVM `ERROR` and left
   appeal, dispute, and precedent reads unchanged:
   [rejection](https://explorer-studio.genlayer.com/tx/0x52bb8d61dc679298fcebb0e08bc877078034bbbad3bc6cd802c30efa25307aae).
6. The owner requested appellate review. The bounded material-equivalence
   strategy accepted independently generated explanations while requiring
   strict agreement on result, authorized affected case, remedy, outcome, and
   canonical obligation findings. Consensus returned `MAJORITY_AGREE` and
   created replacement `JDG_2`:
   [appellate receipt](https://explorer-studio.genlayer.com/tx/0x76511a2b07cffec85c087fb007330cfc52a027e6846164b3a83ba3b8d30f16d2).
7. `JDG_2` was finalized with `appeal_status=closed`, `result=affirmed`,
   `outcome=claimant_wins`, `version=2`, and `supersedes=JDG_1`.
8. The trusted consumer accepted only the current court judgment and stored
   `JDG_2`, version 2, its court identity, case scope, and evidence snapshot:
   [consumer receipt](https://explorer-studio.genlayer.com/tx/0x2a6fc9f3706e231566d1bc1646901fbd4347721fb295b18777d6a3175fab2d48).
9. `settle_judgment` read the current `JDG_2` remedy, created `TR_2` for 900
   GEN, and created a trusted custody child:
   [settlement](https://explorer-studio.genlayer.com/tx/0x649c4edeea364df73846c3cf65b83b6253613f1263ef1985c4b240cb293d8f76),
   [custody child](https://explorer-studio.genlayer.com/tx/0x1b704cbe0113035bfe336680a706af1a8309945a0e625d2d3fa0c3b86b1229d8).
10. The receiver readback bound 900 GEN to the exact claimant and active
    court. A fabricated all-ones confirmation failed. The beneficiary then
    withdrew from custody and the withdrawal child finalized:
    [withdrawal](https://explorer-studio.genlayer.com/tx/0x26f189e8cec2f0ba16dcb278c9168dbc665e80af46d70ddba0f17943beba2269),
    [child](https://explorer-studio.genlayer.com/tx/0x6c122a96bf5b07b75db8790b41c94929992a06f6ed73c265d25e83f3d46d7cfe).
11. A duplicate settlement returned GenVM `ERROR` and did not create a second
    transfer:
    [duplicate rejection](https://explorer-studio.genlayer.com/tx/0x499a1076e2bee6f2870306ab333515bba730e5a9e775f912b909a0327f66c862).

## What the evidence proves

- Appellate consensus is substantive and no longer requires byte-identical
  narrative output. Material conflicts still fail closed.
- The current judgment, not superseded `JDG_1`, controls consumer acceptance
  and settlement.
- The court and receiver agree on transfer identity, recipient, amount, and
  custody status; the duplicate and fake-confirmation negatives preserve
  those invariants.
- Court accounting after settlement was solvent: 100 GEN accounted assets and
  100 GEN liabilities, with no active transfer.
- The receiver's final status is `withdrawal_submitted`, not an invented
  external receipt. The runtime does not provide an EOA receipt oracle, so the
  evidence explicitly distinguishes protocol-child finality from external
  beneficiary receipt finality.
- The consumer record is namespaced by trusted court identity and records
  `AGR_1`, `DIS_1`, `CASE_1`, `JDG_2`, version 2, and the appellate snapshot.

## Production

The production alias is [caseweave.vercel.app](https://caseweave.vercel.app).
`/agreements/new` returned HTTP `200`; the live bundle contained the active
three contract addresses and runtime typed-address conversion and did not
contain the historical deployment addresses. The Vercel inspect URL and exact
deployment are in [DEPLOYMENT.md](DEPLOYMENT.md). No Convert Chrome wallet
session was used or represented as evidence.
