# CaseWeave final hardening test evidence

This report separates deterministic automated gates from live consensus
evidence. A finalized transaction with a GenVM execution error is never counted
as a successful workflow step.

## Pinned toolchain

- repository-local GenLayer CLI: `0.39.1`
- `genlayer-js`: `1.1.8`
- `genvm-linter`: `0.11.0`
- compatible runner: `GENVM_VERSION=v0.2.16`
- network: `studionet`, chain `61999`
- Next.js: `16.2.10`

## Automated gates

The final-source gate run covered:

| Gate | Result |
| --- | --- |
| Python pytest suite (`pytest test -q`) | **18 passed, 0 failed** |
| Python unittest discovery | **6 passed, 0 failed** |
| GenVM lint/schema: court, receiver, consumer | **passed, 0 errors** |
| Frontend Vitest | **22 passed, 0 failed** |
| TypeScript (`tsc --noEmit -p app/tsconfig.json`) | **passed** |
| ESLint | **passed** |
| Next.js production build | **passed; 11 routes** |
| Playwright with local production server | **2 passed** |

Coverage includes bounded deadline fallback, fake/unrelated child proofs,
failed-withdrawal solvency recovery, duplicate/replay settlement, current
appellate remedy selection, bounded refunds, frozen evidence, pending-challenge
gating, GitHub changed-file authenticity, malicious evidence/appellate leaders,
unauthorized appeal mutation, trusted judgment identity, typed address calldata,
execution-error handling, authoritative agreement IDs, and preserved lifecycle
transitions. Negative tests assert protected state remains unchanged.

The first production smoke invocation was intentionally not counted: it ran
before the final Vercel deployment and correctly exposed stale production
configuration. The production smoke gate is re-run only after the final deploy.

## Fresh StudioNet evidence

Canonical record:
[`test-evidence/studionet-final-release-hardening-e2e-final-20261020.json`](test-evidence/studionet-final-release-hardening-e2e-final-20261020.json).

Successful live stages reached:

- typed `create_technical_agreement` for `AGR_2` and exact creator/counterparty
  reads;
- bilateral acceptance and 1000 GEN funding;
- 900 GEN milestone allocation and deliverable registration;
- commit-pinned GitHub proof registration and independent source verification;
- dispute, response, evidence fetches, challenge, counter-evidence and semantic
  challenge resolution;
- precedent search, substantive first-instance verdict, `CASE_1` and `JDG_1`;
- legitimate `APP_1`, separately versioned appellate evidence, and unauthorized
  resolver rejection with unchanged appeal/dispute/precedent state.

The five owner appellate-review transactions were finalized at the transaction
layer but each had GenVM execution error `consensus result MAJORITY_DISAGREE`:

- [attempt 1](https://explorer-studio.genlayer.com/tx/0x57693980329f29bafef56a073a8f414c74ddae2408fab1137f6a015a75e10d4b)
- [attempt 2](https://explorer-studio.genlayer.com/tx/0x5c273fc14a2ec37d92be9595c425a8ed5c605aa82fc4c99a0d8a7f30b9225274)
- [attempt 3](https://explorer-studio.genlayer.com/tx/0x5e472898dfca691e7be7cf39b4243032e3a587a76a704d92c418462274977071)
- [attempt 4](https://explorer-studio.genlayer.com/tx/0xc6e6dfc8bf434b880c9b997a0c72de2d1b0289af8ef2da12d6438e721935a192)
- [attempt 5](https://explorer-studio.genlayer.com/tx/0xa2e8d11e76ff9ace59fa0bba0be015999b78032085f04ccd427346f6ac3eefc6)

This is a live fail-closed validator availability/consensus blocker. The run
therefore stopped before settlement, custody withdrawal, or cross-contract
consumption. Those stages are not claimed as fresh evidence for this release.

## Reproduction commands

```powershell
$env:GENVM_VERSION='v0.2.16'
python -m pytest test -q
python -m unittest discover -v
genvm-lint contracts/caseweave.py --format json
genvm-lint contracts/caseweave_settlement_receiver.py --format json
genvm-lint contracts/caseweave_judgment_consumer.py --format json
npm run test:frontend
npm exec --prefix app -- tsc --noEmit -p tsconfig.json
npm run lint --prefix app
npm run build --prefix app
$env:PLAYWRIGHT_START_SERVER='1'; npm run test:playwright
```

For the live run, provide encrypted disposable keystores only at runtime and
set the final three contract addresses plus the immutable evidence commit. No
credential is stored in the repository.
