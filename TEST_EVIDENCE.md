# CaseWeave milestone test evidence

This file records the gates run for the current milestone source. It does not
convert warnings or expected negative cases into successes.

## Pinned toolchain

    repository-local genlayer: 0.39.1
    genlayer-js: 1.1.8
    genvm-linter: 0.11.0
    chain: studionet / 61999
    GENVM_VERSION: v0.2.16
    Next.js: 16.2.10
    Node.js: 22.23.3 local / Vercel Node 24.x

## Local gates

| Gate | Result |
| --- | --- |
| Python unittest discovery | 6 passed, 0 failures |
| GenVM linter/schema: contracts/caseweave.py | passed; 61 methods, 32 views, 29 writes |
| GenVM linter/schema: contracts/caseweave_judgment_consumer.py | passed |
| Direct Mode contract suite | 4 passed, 0 failures |
| Frontend Vitest suite | 20 passed, 0 failures |
| TypeScript: app/node_modules/.bin/tsc.cmd --noEmit -p app/tsconfig.json | passed |
| Local Next.js production build | passed; all 11 routes generated |
| Playwright local critical workflow | 1 passed |
| Playwright production critical workflow | 1 passed |
| Live StudioNet harness | 1 test passed, 24 finalized transactions; one expected unauthorized transaction had GenVM ERROR and unchanged state |

The Direct Mode tests exercise lifecycle transitions, typed address storage,
source identity and commit validation, source-fact retrieval, evidence
challenges, malicious appeal resolution, consensus appellate resolution,
appeal-bond return, escrow solvency, duplicate review, stale judgment
rejection, and failed-state preservation. The frontend suite covers runtime
CalldataAddress bytes and address tagging, malformed/zero/self addresses,
structured calldata, execution-error handling, authoritative agreement-ID
resolution, and no-navigation-on-failure.

The linter emitted only the contract's existing bare-Exception warnings. Lint,
schema extraction, and semantic validation passed using the compatible cached
v0.2.16 runner; the contract runner hash was not changed.

## Live StudioNet result

The canonical record is [test-evidence/studionet-e2e.json](test-evidence/studionet-e2e.json).
It records the 24 application and consumer transactions, full hashes and
explorer URLs, FINALIZED consensus status, GenVM execution result, object IDs,
before/after reads, child transfer hashes, judgment consumption, and final
accounting. The live sequence is summarized in
[MILESTONE_REVIEW_EVIDENCE.md](MILESTONE_REVIEW_EVIDENCE.md) and fully linked
in [DEPLOYMENT.md](DEPLOYMENT.md).

Expected negative evidence:

- Unrelated-wallet resolve attempt:
  [0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d](https://explorer-studio.genlayer.com/tx/0x28bcbea0e38df8b812524a4e70b5d38cfc2a85f9b8965f35af2a089c66d9549d)
  finalized with GenVM ERROR and rollback payload “only the owner may access
  the administrative appeal guard”; protected state was unchanged.
- A prior live consensus disagreement is retained in the harness development
  history as a fail-closed case; the final clean run used immutable,
  commit-pinned counter-evidence and completed all required transitions.

## Commands

    python -m unittest discover -v
    $env:GENVM_VERSION='v0.2.16'; genvm-lint check contracts/caseweave.py --json
    $env:GENVM_VERSION='v0.2.16'; genvm-lint check contracts/caseweave_judgment_consumer.py --json
    gltest.exe test/test_caseweave_direct.py test/test_caseweave_milestone_direct.py -v -s
    npm run test:frontend
    app/node_modules/.bin/tsc.cmd --noEmit -p app/tsconfig.json
    npm run build --prefix app
    npm run test:playwright

For the live run, provide encrypted local keystores at runtime and set
CASEWEAVE_E2E_CONTRACT_ADDRESS, CASEWEAVE_E2E_CONSUMER_ADDRESS, and the
commit-pinned evidence SHA. No key, password, keystore, or environment secret
is checked in.
