# CaseWeave final release test evidence

This report separates deterministic gates from live consensus evidence. A
finalized transaction with a GenVM execution error is never counted as a
successful workflow step.

## Pinned toolchain

- repository-local GenLayer CLI: `0.39.1`
- `genlayer-js`: `1.1.8`
- `genvm-linter`: `0.11.0`
- compatible runner: `GENVM_VERSION=v0.2.16`
- network: `studionet`, chain `61999`
- Next.js: `16.2.10`

## Automated gates

| Gate | Result |
| --- | --- |
| Python regression suite (`pytest test -q`) | **20 passed, 0 failed** |
| GenLayer Direct Mode contract suite | **14 passed, 0 failed** |
| Python unittest discovery | **6 passed, 0 failed** |
| GenVM lint/schema: court, receiver, consumer | **passed, 0 errors** |
| Frontend Vitest | **22 passed, 0 failed** |
| TypeScript (`tsc --noEmit -p app/tsconfig.json`) | **passed** |
| ESLint | **passed** |
| Next.js production build | **passed; 11 routes** |
| Playwright with local production server | **2 passed** |

The Direct Mode and adversarial tests cover bounded deadline fallback,
fake/unrelated child proofs, failed-withdrawal solvency recovery, duplicate
and replay settlement, current appellate remedy selection, bounded refunds,
frozen evidence, pending-challenge gating, GitHub changed-file authenticity,
malicious evidence/appellate leaders, unauthorized appeal mutation, trusted
judgment identity, typed address calldata, execution-error handling,
authoritative agreement IDs, and preserved lifecycle transitions. Negative
tests assert that protected state remains unchanged after invalid operations.

The pinned CLI was checked with the repository-local executable and reported
`0.39.1`; network inspection reported `studionet` and chain `61999`. The three
contract linter runs returned `ok: true` under `genvm-linter==0.11.0` and
`GENVM_VERSION=v0.2.16`.

## Appellate consensus regression

The original five fresh appellate transactions failed closed with
`MAJORITY_DISAGREE`. Receipt inspection showed validator execution succeeded
but material signatures diverged on unconstrained obligation labels and
`affected_case_id` representation. The fix does not accept arbitrary output:
it commits canonical obligation identifiers, validates a complete one-per-ID
set, compares result, authorized precedent target, remedy, outcome, and
findings strictly, and excludes only bounded narrative prose from equality.
The source and test changes are in commit
[`8e4bbcf`](https://github.com/ometere123/caseweave/commit/8e4bbcf).

Local regression cases prove acceptance of the same material decision with
different reasoning, rejection of missing/duplicate/alias obligation IDs,
rejection of material result/remedy/recipient conflicts, and safe handling of
malformed or incomplete responses.

## Fresh StudioNet evidence

The canonical machine-readable record is
[`test-evidence/studionet-final-appellate-remediation-20261027.json`](test-evidence/studionet-final-appellate-remediation-20261027.json).
It records 37 finalized transaction attempts, all hashes and explorer links,
execution results, child transactions, object IDs, and state reads.

The successful path is:

1. `AGR_1` created and accepted; 1000 GEN funded and 900 GEN allocated to a
   milestone.
2. Commit-pinned delivery evidence was independently fetched and verified,
   including GitHub repository identity, immutable commit, and changed-file
   metadata.
3. `DIS_1` was filed, answered, challenged, and semantically resolved through
   evidence consensus.
4. Precedent search and first-instance verdict consensus created `CASE_1` and
   `JDG_1`.
5. `APP_1` was filed with a bond and separately versioned appellate evidence.
6. An unrelated wallet's resolver call failed with GenVM `ERROR` and unchanged
   state: [rejection receipt](https://explorer-studio.genlayer.com/tx/0x52bb8d61dc679298fcebb0e08bc877078034bbbad3bc6cd802c30efa25307aae).
7. The owner submitted appellate review once. Consensus reached
   `MAJORITY_AGREE`, GenVM `SUCCESS`, and created current judgment `JDG_2`:
   [appellate receipt](https://explorer-studio.genlayer.com/tx/0x76511a2b07cffec85c087fb007330cfc52a027e6846164b3a83ba3b8d30f16d2).
8. `JDG_2` was consumed by the trusted second Intelligent Contract:
   [consumer receipt](https://explorer-studio.genlayer.com/tx/0x2a6fc9f3706e231566d1bc1646901fbd4347721fb295b18777d6a3175fab2d48).
9. `settle_judgment` used the current `JDG_2` remedy and created `TR_2` for
   900 GEN:
   [settlement receipt](https://explorer-studio.genlayer.com/tx/0x649c4edeea364df73846c3cf65b83b6253613f1263ef1985c4b240cb293d8f76).
10. The trusted receiver recorded 900 GEN for the exact beneficiary and the
    court-created custody child finalized successfully:
    [custody child](https://explorer-studio.genlayer.com/tx/0x1b704cbe0113035bfe336680a706af1a8309945a0e625d2d3fa0c3b86b1229d8).
11. A fabricated all-ones confirmation failed, then the beneficiary withdrew
    from tracked custody:
    [withdrawal](https://explorer-studio.genlayer.com/tx/0x26f189e8cec2f0ba16dcb278c9168dbc665e80af46d70ddba0f17943beba2269),
    [withdrawal child](https://explorer-studio.genlayer.com/tx/0x6c122a96bf5b07b75db8790b41c94929992a06f6ed73c265d25e83f3d46d7cfe).
12. A duplicate settlement failed with unchanged state:
    [duplicate rejection](https://explorer-studio.genlayer.com/tx/0x499a1076e2bee6f2870306ab333515bba730e5a9e775f912b909a0327f66c862).

The live final state was `APP_1=resolved`, `JDG_2=finalized`,
`appeal_status=closed`, `JDG_2.supersedes=JDG_1`, `TR_2=custodied`, and
receiver custody `TR_2=withdrawal_submitted`. The withdrawal child finalized
successfully, but no claim is made that this is an externally verified EOA
receipt: the runtime does not provide a cryptographic EOA receipt oracle.
That internal/external finality boundary is preserved in both contracts and
the evidence record.

The consumer stored `court_identity` equal to the deployed court,
`agreement_id=AGR_1`, `dispute_id=DIS_1`, `case_id=CASE_1`, `judgment_id=JDG_2`,
`version=2`, `outcome=claimant_wins`, and the appellate evidence snapshot hash.
Court accounting after settlement reported `total_accounted_assets=100`,
`total_liabilities=100`, `active_transfer_id=""`, and `solvent=true`.

## Production verification

`https://caseweave.vercel.app/agreements/new` returned HTTP `200`. The live
bundle contained the active Court, Receiver, and Consumer addresses plus the
runtime typed-address validation/conversion path, and did not contain the
superseded addresses. The READY deployment is recorded in
[DEPLOYMENT.md](DEPLOYMENT.md).

## Reproduction commands

```powershell
$env:GENVM_VERSION='v0.2.16'
python -m pytest test -q
gltest test/test_caseweave_direct.py test/test_caseweave_milestone_direct.py -q
python -m unittest discover -v
python -m genvm_linter.cli check contracts/caseweave.py --json
python -m genvm_linter.cli check contracts/caseweave_settlement_receiver.py --json
python -m genvm_linter.cli check contracts/caseweave_judgment_consumer.py --json
npm run test:frontend
npm exec --prefix app -- tsc --noEmit -p tsconfig.json
npm run lint --prefix app
npm run build --prefix app
$env:PLAYWRIGHT_START_SERVER='1'; npm run test:playwright
```

The live run was executed once against the final deployed addresses with
runtime-only disposable keystores. No credential or private key is stored in
the repository.
