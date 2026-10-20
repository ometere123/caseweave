# CaseWeave security-remediation test evidence

This report records the gates for the final adversarial remediation. It does
not turn expected negative transactions into successes.

## Pinned toolchain

- repository-local GenLayer CLI: `0.39.1`
- `genlayer-js`: `1.1.8`
- `genvm-linter`: `0.11.0`
- compatible runner: `GENVM_VERSION=v0.2.16`
- network: `studionet`, chain `61999`
- Next.js: `16.2.10`

## Local gates

| Gate | Result |
| --- | --- |
| Direct Mode contract suites (`test_caseweave_direct.py`, `test_caseweave_milestone_direct.py`, `test_contract_guardrails.py`) | **16 passed, 0 failed** |
| GenVM lint/schema: `contracts/caseweave.py` | **passed; 0 errors** |
| GenVM lint/schema: `contracts/caseweave_settlement_receiver.py` | **passed; 0 errors** |
| GenVM lint/schema: `contracts/caseweave_judgment_consumer.py` | **passed; 0 errors** |
| Frontend Vitest: `test/frontend/caseweave.test.ts` | **20 passed, 0 failed** |
| TypeScript: `tsc --noEmit -p app/tsconfig.json` | **passed** |
| ESLint | **passed** |
| Next.js production build | **passed; 11 routes** |
| Playwright local critical workflow | **2 passed** |
| Playwright production critical workflow | **2 passed** |
| StudioNet E2E: `test/frontend/studionet_e2e.test.ts` | **1 passed; 32 finalized transactions** |

The Direct Mode suite covers fake/unrelated child proofs, failed-transfer
reconciliation, duplicate and replay settlement, current appellate remedy
selection, bounded partial settlement and remainder refund, late funding
rejection, frozen evidence, pending challenge gating, malicious evidence and
appellate leaders, unauthorized appeal mutation, trusted judgment identity,
and preserved agreement/dispute/proof transitions. The frontend tests cover
runtime `CalldataAddress` construction and SDK address tagging, malformed
addresses, execution-error handling, authoritative agreement IDs, and
success/failure navigation behavior.

## Live StudioNet evidence

Canonical record:
[`test-evidence/studionet-remediation-final-20261020.json`](test-evidence/studionet-remediation-final-20261020.json).

The run used two party wallets, the deployment owner, and a third unrelated
wallet. It created `AGR_1`, `PROOF_1`, `DIS_1`, `CASE_1`, `APP_1`, `JDG_2`,
and custody transfers `TR_1`/`TR_2`. Every successful transaction reached
`FINALIZED` with GenVM `SUCCESS`.

Expected negative evidence:

- Unrelated appeal resolver:
  [resolve_appeal transaction](https://explorer-studio.genlayer.com/tx/0x7d685d0d17d5752639c0065c22717dd002a23993c59cc813d8c42b0b4ac47d1e)
  finalized with GenVM `ERROR`, rollback `only the owner may access the
  administrative appeal guard`, and unchanged appeal/dispute/precedent reads.
- Fabricated appeal-bond confirmation:
  [confirm_transfer transaction](https://explorer-studio.genlayer.com/tx/0x2f4aa2ced672cbedb82ad5ab94fcd0611b04bc7a543246c5a00e1b5a8f29bf69)
  finalized with GenVM `ERROR`, rollback `manual child hash confirmations are
  disabled`, and unchanged transfer state.
- Fabricated settlement confirmation:
  [confirm_transfer transaction](https://explorer-studio.genlayer.com/tx/0x8904f983d7fb737d6d8a3bad9e564d77379dcc235a202b4cc0cb4688364b59d8)
  produced the same fail-closed result and unchanged `TR_2` custody.
- Duplicate settlement:
  [settle_judgment transaction](https://explorer-studio.genlayer.com/tx/0x9e62d42115a99b80e6cc0924125287430b5caca61eed09e846d9c3e07de9fb79)
  finalized with GenVM `ERROR`, rollback `judgment settlement has already
  been created`.

## Reproduction commands

```powershell
$env:GENVM_VERSION='v0.2.16'
python -m pytest test/test_caseweave_direct.py test/test_caseweave_milestone_direct.py test/test_contract_guardrails.py -q -s
genvm-lint contracts/caseweave.py --format json
genvm-lint contracts/caseweave_settlement_receiver.py --format json
genvm-lint contracts/caseweave_judgment_consumer.py --format json
npm run test:frontend
npm exec --prefix app -- tsc --noEmit -p tsconfig.json
npm run lint --prefix app
npm run build --prefix app
npm run test:playwright
```

For the live run, supply encrypted disposable keystores at runtime and set
the three contract addresses and evidence commit. No credential is checked
in. The complete transaction table and state reads are in
[DEPLOYMENT.md](DEPLOYMENT.md).
