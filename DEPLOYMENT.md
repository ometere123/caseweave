# CaseWeave release deployment record

This record covers the final adversarial hardening source deployed to
StudioNet. It is factual: the fresh live run completed through the
first-instance judgment and unauthorized-appeal rejection, but appellate
consensus failed closed with `MAJORITY_DISAGREE` on all five bounded attempts.
It is not presented as a completed end-to-end settlement proof.

## Environment

- Network: `studionet`
- Chain ID: `61999`
- RPC: <https://studio.genlayer.com/api>
- Explorer: <https://explorer-studio.genlayer.com>
- Repository-local CLI: `genlayer@0.39.1`
- SDK: `genlayer-js@1.1.8`
- GenVM linter: `0.11.0`
- Compatible runner: `GENVM_VERSION=v0.2.16`
- Production: <https://caseweave.vercel.app>

## Active contracts

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| `CaseWeaveCourt` | `0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f` | `3FDDDA6866DA094D6F6055F3520DCC08523E9840B183BB63560B7908AD6D4EA0` |
| `CaseWeaveSettlementReceiver` | `0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7` | `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3` |
| `CaseWeaveJudgmentConsumer` | `0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488` | `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8` |

Owner/deployer: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`.
`get_owner()` returned that address. Court → receiver, receiver → court, and
consumer → court bindings were read after configuration and matched the table.

## Deployment and configuration receipts

- Court deploy: [0x8d50201b75c382ccec7bfc4896ab07ed3af330cb5f7db5c7cb1b7a3de1ce6001](https://explorer-studio.genlayer.com/tx/0x8d50201b75c382ccec7bfc4896ab07ed3af330cb5f7db5c7cb1b7a3de1ce6001)
- Receiver deploy: [0xbbf9bcc30495ab146b6eaa55cf157830b4914dd57e89e010289b050e6579506d](https://explorer-studio.genlayer.com/tx/0xbbf9bcc30495ab146b6eaa55cf157830b4914dd57e89e010289b050e6579506d)
- Consumer deploy: [0xe2a9e79cb30e0e20a8749be4024ea517aba9117831efc182709c04e3ff9fd99d](https://explorer-studio.genlayer.com/tx/0xe2a9e79cb30e0e20a8749be4024ea517aba9117831efc182709c04e3ff9fd99d)
- Receiver → court configuration: [0x8cb92506abb2b365312a8fe65a200beb5e9d6d9d8ec6a835aa8136f80b3d7e00](https://explorer-studio.genlayer.com/tx/0x8cb92506abb2b365312a8fe65a200beb5e9d6d9d8ec6a835aa8136f80b3d7e00)
- Court → receiver configuration: [0x6dc3c0f99db523d4aeae03f73395e46fc524f49d0d0e3ac5f36f2224eddfbdfa](https://explorer-studio.genlayer.com/tx/0x6dc3c0f99db523d4aeae03f73395e46fc524f49d0d0e3ac5f36f2224eddfbdfa)

All five receipts finalized with GenVM `SUCCESS`. Live code retrieval matched
the local source byte-for-byte; the hashes above are SHA-256 of those exact
source files.

## Fresh StudioNet lifecycle record

Machine-readable record:
[`test-evidence/studionet-final-release-hardening-e2e-final-20261020.json`](test-evidence/studionet-final-release-hardening-e2e-final-20261020.json).
It used the final addresses, two party wallets, the deployment owner, and an
unrelated third wallet. The source-authentication fixture was the immutable
`afb440fef324d09de6db12f40804ae9dce815c6e`, whose GitHub API changed-file set
matches the submitted proof list exactly.

The first 26 application transactions finalized successfully and created
`AGR_2`, `PROOF_1`, `DIS_1`, `CASE_1`, `JDG_1`, and `APP_1`. The unrelated
`resolve_appeal` call finalized with `ERROR` and unchanged state. The five
owner `request_appeal_review` attempts finalized at transaction level but each
returned GenVM execution error `consensus result MAJORITY_DISAGREE`; therefore
no appellate judgment or settlement was fabricated or attempted.

| # | Method | Transaction |
| ---: | --- | --- |
| 1 | `create_technical_agreement` → `AGR_2` | [0x7a78e76354511d2e92f04afdea390f0f4adc470c6749307bbaf743d38f942faf](https://explorer-studio.genlayer.com/tx/0x7a78e76354511d2e92f04afdea390f0f4adc470c6749307bbaf743d38f942faf) |
| 2 | `accept_agreement` | [0x21aed688358875ac36c11694e854bfb231005f2d18d516294100d2e6253d13b2](https://explorer-studio.genlayer.com/tx/0x21aed688358875ac36c11694e854bfb231005f2d18d516294100d2e6253d13b2) |
| 3 | `fund_agreement` → 1000 GEN | [0xf2e9fa3802c82b19c0c1177b5ed89dfbd3fdb50a40f47c553e825c99ea26f579](https://explorer-studio.genlayer.com/tx/0xf2e9fa3802c82b19c0c1177b5ed89dfbd3fdb50a40f47c553e825c99ea26f579) |
| 4 | `fund_milestone` → 900 GEN | [0x3e60e5f814f7ac93cd5af81439a85c08dd15e683c2ff7528a521d192fe74c704](https://explorer-studio.genlayer.com/tx/0x3e60e5f814f7ac93cd5af81439a85c08dd15e683c2ff7528a521d192fe74c704) |
| 5 | `submit_deliverable` | [0xb07410ee9ea3ae18d3eaad639de8936dcbe09b76c64e323ff838bf0f3c46a97f](https://explorer-studio.genlayer.com/tx/0xb07410ee9ea3ae18d3eaad639de8936dcbe09b76c64e323ff838bf0f3c46a97f) |
| 6 | `register_delivery_proof` → `PROOF_1` | [0xee595d09281081436c4472aa3dfde602579f42b015becc307dce2a9c81bff41d](https://explorer-studio.genlayer.com/tx/0xee595d09281081436c4472aa3dfde602579f42b015becc307dce2a9c81bff41d) |
| 7 | `verify_delivery_proof` → verified source facts | [0x177479faf658916e226157bd4305ed2b45ba9db6f635fbd22331f3ca52649b53](https://explorer-studio.genlayer.com/tx/0x177479faf658916e226157bd4305ed2b45ba9db6f635fbd22331f3ca52649b53) |
| 8 | `file_performance_dispute` → `DIS_1` | [0xb2d05259e19c8b4dcbfce55895bbd573d0a1c070dcb94b674b242c9a02e39ac9](https://explorer-studio.genlayer.com/tx/0xb2d05259e19c8b4dcbfce55895bbd573d0a1c070dcb94b674b242c9a02e39ac9) |
| 9 | `submit_response` | [0xa37166ce962830faa8f7ddd663a73bda5d2be17b4a6ce31676316c4646ae46c7](https://explorer-studio.genlayer.com/tx/0xa37166ce962830faa8f7ddd663a73bda5d2be17b4a6ce31676316c4646ae46c7) |
| 10 | `verify_evidence_url` → respondent evidence | [0x2732ea9f17c8c15c085ef8c6f35b66d2ad05ba903369462b01412280a6a0494f](https://explorer-studio.genlayer.com/tx/0x2732ea9f17c8c15c085ef8c6f35b66d2ad05ba903369462b01412280a6a0494f) |
| 11 | `set_dispute_deadlines` → proposed | [0x38fbafe5be415b37cc7ff64b7ad5573a253032ee0a8ec25ea0659598da5827dd](https://explorer-studio.genlayer.com/tx/0x38fbafe5be415b37cc7ff64b7ad5573a253032ee0a8ec25ea0659598da5827dd) |
| 12 | `set_dispute_deadlines` → accepted | [0x2260bef2a07491cc4e26c2e51346cd918179ff5fef96821373a5cb550eba6ab7](https://explorer-studio.genlayer.com/tx/0x2260bef2a07491cc4e26c2e51346cd918179ff5fef96821373a5cb550eba6ab7) |
| 13 | `set_appeal_window` → proposed | [0xa0e285a6965b26db8593486bd682068be66d80cc4efa4be885b4fe3d468c5cc0](https://explorer-studio.genlayer.com/tx/0xa0e285a6965b26db8593486bd682068be66d80cc4efa4be885b4fe3d468c5cc0) |
| 14 | `set_appeal_window` → accepted | [0x967502837628d19a9942fd71a9385616650b078c97619bb0c5f1fcadc8b86986](https://explorer-studio.genlayer.com/tx/0x967502837628d19a9942fd71a9385616650b078c97619bb0c5f1fcadc8b86986) |
| 15 | `verify_evidence_url` → claimant snapshot | [0x5c042a6479291d91895c730a8391cb8037792bc1b5e4d163d6edad59efed6144](https://explorer-studio.genlayer.com/tx/0x5c042a6479291d91895c730a8391cb8037792bc1b5e4d163d6edad59efed6144) |
| 16 | `add_evidence` → GitHub commit metadata | [0x4a133fd631c9edf5e6fdabeade10b7021cd058f2ed17924d5092941eb624ce2d](https://explorer-studio.genlayer.com/tx/0x4a133fd631c9edf5e6fdabeade10b7021cd058f2ed17924d5092941eb624ce2d) |
| 17 | `verify_evidence_url` → source facts | [0xbd02741d3e7452d7eb2445a5a4142c70fc73de8faee64f6997189bdc0dbaa869](https://explorer-studio.genlayer.com/tx/0xbd02741d3e7452d7eb2445a5a4142c70fc73de8faee64f6997189bdc0dbaa869) |
| 18 | `challenge_evidence` | [0xdf15dad42d8ac39bde10e8e0551c6dadb090ea76bb1517db8c1d497392b00a35](https://explorer-studio.genlayer.com/tx/0xdf15dad42d8ac39bde10e8e0551c6dadb090ea76bb1517db8c1d497392b00a35) |
| 19 | `verify_evidence_url` → counter-evidence | [0xd647641eb9dd577193e28c60ff886d50bc53b22de2878f6091738566069fa03c](https://explorer-studio.genlayer.com/tx/0xd647641eb9dd577193e28c60ff886d50bc53b22de2878f6091738566069fa03c) |
| 20 | `resolve_evidence_challenge` | [0x3b19b588679275db30e79bbfb9f0cea62a7c50f6b32959c0c12e2f4d6c8754bf](https://explorer-studio.genlayer.com/tx/0x3b19b588679275db30e79bbfb9f0cea62a7c50f6b32959c0c12e2f4d6c8754bf) |
| 21 | `request_precedent_search` | [0xc2f66dc00c3cfa97bb3d73ab61db95cc6adba5c1d25698462e71267bd1e183e9](https://explorer-studio.genlayer.com/tx/0xc2f66dc00c3cfa97bb3d73ab61db95cc6adba5c1d25698462e71267bd1e183e9) |
| 22 | `request_verdict` → claimant wins | [0x6a5c83f8a7ffe93b9304dc6dde20d2b5cb28e9b069c0bb9d477135a3d4a08c22](https://explorer-studio.genlayer.com/tx/0x6a5c83f8a7ffe93b9304dc6dde20d2b5cb28e9b069c0bb9d477135a3d4a08c22) |
| 23 | `finalize_precedent` → `CASE_1`, `JDG_1` | [0x1755d2afa44b65298306a0edb13ef33f730bac3e97faf045fa91cb4cba36f1e2](https://explorer-studio.genlayer.com/tx/0x1755d2afa44b65298306a0edb13ef33f730bac3e97faf045fa91cb4cba36f1e2) |
| 24 | `file_appeal` → `APP_1` | [0xc42b56f8f2596289a4673cd0c020f7933751c9871c8099cedf9e6609be4bfcd9](https://explorer-studio.genlayer.com/tx/0xc42b56f8f2596289a4673cd0c020f7933751c9871c8099cedf9e6609be4bfcd9) |
| 25 | `add_appeal_evidence` | [0xbcd253c35dcd0e082769040da6855c2430bc6b753daf9140d225ee183283c53b](https://explorer-studio.genlayer.com/tx/0xbcd253c35dcd0e082769040da6855c2430bc6b753daf9140d225ee183283c53b) |
| 26 | `verify_evidence_url` → appellate evidence | [0xe3bfaa2b8bcec41bb9a8b9b473dc95447a532641ec92ff4ea95676082da98ddb](https://explorer-studio.genlayer.com/tx/0xe3bfaa2b8bcec41bb9a8b9b473dc95447a532641ec92ff4ea95676082da98ddb) |
| 27 | unauthorized `resolve_appeal` → unchanged | [0x693bad387ed7accff1ac82130e6f892de592b234e2e9bbd6f101f6c2b4b26a52](https://explorer-studio.genlayer.com/tx/0x693bad387ed7accff1ac82130e6f892de592b234e2e9bbd6f101f6c2b4b26a52) |
| 28 | `request_appeal_review` attempt 1 → `MAJORITY_DISAGREE` | [0x57693980329f29bafef56a073a8f414c74ddae2408fab1137f6a015a75e10d4b](https://explorer-studio.genlayer.com/tx/0x57693980329f29bafef56a073a8f414c74ddae2408fab1137f6a015a75e10d4b) |
| 29 | `request_appeal_review` attempt 2 → `MAJORITY_DISAGREE` | [0x5c273fc14a2ec37d92be9595c425a8ed5c605aa82fc4c99a0d8a7f30b9225274](https://explorer-studio.genlayer.com/tx/0x5c273fc14a2ec37d92be9595c425a8ed5c605aa82fc4c99a0d8a7f30b9225274) |
| 30 | `request_appeal_review` attempt 3 → `MAJORITY_DISAGREE` | [0x5e472898dfca691e7be7cf39b4243032e3a587a76a704d92c418462274977071](https://explorer-studio.genlayer.com/tx/0x5e472898dfca691e7be7cf39b4243032e3a587a76a704d92c418462274977071) |
| 31 | `request_appeal_review` attempt 4 → `MAJORITY_DISAGREE` | [0xc6e6dfc8bf434b880c9b997a0c72de2d1b0289af8ef2da12d6438e721935a192](https://explorer-studio.genlayer.com/tx/0xc6e6dfc8bf434b880c9b997a0c72de2d1b0289af8ef2da12d6438e721935a192) |
| 32 | `request_appeal_review` attempt 5 → `MAJORITY_DISAGREE` | [0xa2e8d11e76ff9ace59fa0bba0be015999b78032085f04ccd427346f6ac3eefc6](https://explorer-studio.genlayer.com/tx/0xa2e8d11e76ff9ace59fa0bba0be015999b78032085f04ccd427346f6ac3eefc6) |

The last five rows are rejected executions, not completed appellate decisions.
No settlement, custody, withdrawal, or judgment-consumer write was attempted
after the failed appeal consensus.

## On-chain source and security checks

- Court, receiver, and consumer source retrieval matched the local files and
  SHA-256 values above.
- Court owner, receiver binding, and consumer trust binding were read on-chain.
- The fresh run proved typed agreement parties, real GEN funding, objective
  GitHub source facts, frozen evidence/challenge gating, first-instance
  consensus, an immutable `CASE_1`/`JDG_1`, and unauthorized appeal rejection.
- Appellate failure remained fail-closed; protected first-instance state was not
  overwritten by a fabricated result.

## Production configuration

Vercel production variables were updated to the active addresses and chain
`61999`. The tested source commit was
`0fcd95e905696be8c75eca3708b152c9566119a0`. The production deployment is
READY and aliased to the public application:

- Deployment: `dpl_7BFnjrpVkXuN6gDzsVDfrCwRVRyw`
- Inspect: https://vercel.com/delealufejoel-4184s-projects/caseweave/7BFnjrpVkXuN6gDzsVDfrCwRVRyw
- Production: https://caseweave.vercel.app
- Deployment URL: https://caseweave-mm0al2rky-delealufejoel-4184s-projects.vercel.app
- HTTP check: `GET /agreements/new` returned `200`.
- Live bundle check: active Court address and typed-address validation/conversion
  markers were present; the superseded Court address was absent.
- CI: https://github.com/ometere123/caseweave/actions/runs/39475875319

Historical addresses are provenance only and are not active configuration.
