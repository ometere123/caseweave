# CaseWeave final release review

## Decision

**COMPLETE for the requested appellate closeout.** The corrected contracts are
deployed, the final source is committed, the fresh StudioNet lifecycle reached
successful appellate consensus, current-judgment settlement, trusted custody,
beneficiary withdrawal submission, and cross-contract consumption. Automated
gates passed. The only explicitly unclaimed boundary is an externally verified
EOA receipt, because the pinned runtime exposes no cryptographic EOA receipt
oracle; the receiver records the protocol child and preserves
`withdrawal_submitted` rather than claiming more.

## Release identity

- Baseline requested for this closeout: `1af1aca5aaac511e294ea0c024030f7284c087bd`
- Latest pre-closeout main: `a39e727` (`a39e727...`)
- Deployed contract source commit: [`645208b7eaa2a1efdc2c296f784b26f89d7a635e`](https://github.com/ometere123/caseweave/commit/645208b7eaa2a1efdc2c296f784b26f89d7a635e)
- Final release commit: the commit containing this review and the canonical
  evidence record; its immutable SHA is reported in the handoff after push
- Immutable comparison: `https://github.com/ometere123/caseweave/compare/1af1aca5aaac511e294ea0c024030f7284c087bd...<final-release-commit>`
- Network: StudioNet, chain `61999`
- GitHub: <https://github.com/ometere123/caseweave>

The contract source itself is unchanged by this evidence-only commit, so the
deployed contract SHA-256 remains authoritative:

| Contract | Address | SHA-256 |
| --- | --- | --- |
| Court | `0x1FB9cA025916AA57A0bC221346cBD913282a5417` | `A453AC58196191D26AD7ECB86FAF042B590FC5489968CDBC81D5EE96C14D8278` |
| Receiver | `0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D` | `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3` |
| Consumer | `0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C` | `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8` |

Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`.

## What changed

The appellate failure was traced to an over-constrained equivalence boundary,
not accepted as a protocol or infrastructure success. The contract now binds
every validator to the same committed canonical obligation identifiers and
compares the material decision tuple strictly: result, authorized precedent
target, remedy, outcome, and complete obligation findings. Narrative reasoning
and bounded source prose may differ. Missing, duplicate, aliased,
contradictory, malformed, stale, or unauthorized output still fails closed.

The corrected client/deployment configuration points to the active contracts;
the runtime `CalldataAddress` path is preserved and live production bundle
verification found no historical address.

## Automated evidence

The final gate record is [TEST_EVIDENCE.md](TEST_EVIDENCE.md): 20 pytest tests,
14 Direct Mode tests, 6 unittest tests, 22 Vitest tests, 2 Playwright tests,
GenVM lint/schema for all three contracts, TypeScript, ESLint, and production
build all passed with zero failures. The relevant successful CI run is linked
in [DEPLOYMENT.md](DEPLOYMENT.md) after the final push.

## Fresh live evidence

The full 37-attempt receipt/state record is
[`test-evidence/studionet-final-appellate-remediation-20261027.json`](test-evidence/studionet-final-appellate-remediation-20261027.json).
The key proof links are:

- Successful appellate consensus and replacement `JDG_2`: [transaction](https://explorer-studio.genlayer.com/tx/0x76511a2b07cffec85c087fb007330cfc52a027e6846164b3a83ba3b8d30f16d2)
- Unauthorized resolver rejection, unchanged state: [transaction](https://explorer-studio.genlayer.com/tx/0x52bb8d61dc679298fcebb0e08bc877078034bbbad3bc6cd802c30efa25307aae)
- Current `JDG_2` consumed by trusted consumer: [transaction](https://explorer-studio.genlayer.com/tx/0x2a6fc9f3706e231566d1bc1646901fbd4347721fb295b18777d6a3175fab2d48)
- 900 GEN settlement to `TR_2`: [transaction](https://explorer-studio.genlayer.com/tx/0x649c4edeea364df73846c3cf65b83b6253613f1263ef1985c4b240cb293d8f76)
- Court-to-receiver custody child: [transaction](https://explorer-studio.genlayer.com/tx/0x1b704cbe0113035bfe336680a706af1a8309945a0e625d2d3fa0c3b86b1229d8)
- Beneficiary withdrawal: [transaction](https://explorer-studio.genlayer.com/tx/0x26f189e8cec2f0ba16dcb278c9168dbc665e80af46d70ddba0f17943beba2269)
- Withdrawal child: [transaction](https://explorer-studio.genlayer.com/tx/0x6c122a96bf5b07b75db8790b41c94929992a06f6ed73c265d25e83f3d46d7cfe)
- Duplicate settlement rejection: [transaction](https://explorer-studio.genlayer.com/tx/0x499a1076e2bee6f2870306ab333515bba730e5a9e775f912b909a0327f66c862)
- Fabricated settlement confirmation rejection: [transaction](https://explorer-studio.genlayer.com/tx/0xdc6634128fe4d2697331fd1e2c64d4ab09ac3f06600af8457d5a797379a6169c)

Final reads: `APP_1=resolved`, `JDG_2=finalized`, `appeal_status=closed`,
`JDG_2.supersedes=JDG_1`, `TR_2=custodied`, receiver custody
`withdrawal_submitted`, consumer record version `2`, and court accounting
`assets=100`, `liabilities=100`, `solvent=true`.

## Production and CI

- Production alias: <https://caseweave.vercel.app>
- Production route check: `GET /agreements/new` → HTTP `200`
- Vercel inspect/deployment: recorded in [DEPLOYMENT.md](DEPLOYMENT.md)
- GitHub Actions: final run URL is recorded in [DEPLOYMENT.md](DEPLOYMENT.md)
- No Convert Chrome supervised wallet session was performed; this closeout
  reports automated and disposable-key StudioNet evidence only.

## Reviewer assessment

The evidence supports the requested GenLayer Fit `4/5` target and strong
Contract Quality, Engineering, and Frontend/UX targets without asserting a
guaranteed reviewer score. The remaining documented limitation is the runtime
boundary between a finalized withdrawal child and an externally verified EOA
receipt. No administrative appeal-merits bypass, fabricated transaction, or
stale judgment settlement is claimed.
