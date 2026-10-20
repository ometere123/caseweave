# CaseWeave final adversarial-remediation deployment

This is the reproducible release record for the focused security remediation
from baseline commit `19d8cf71b2572e4082c82d44a8573b153dcc941d`. Historical
deployments remain listed only as provenance; the addresses below are the
active StudioNet targets.

## Pinned environment

- Network: `studionet`
- Chain ID: `61999`
- RPC: <https://studio.genlayer.com/api>
- Explorer: <https://explorer-studio.genlayer.com>
- Repository-local CLI: `genlayer@0.39.1`
- SDK: `genlayer-js@1.1.8`
- Linter: `genvm-linter==0.11.0`
- Compatible runner: `GENVM_VERSION=v0.2.16`
- Frontend: <https://caseweave.vercel.app>

No chain 61997, `studio-dev`, `studio-devnet`, global CLI, private key,
keystore, or credential is part of the repository.

## Final contracts

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| `CaseWeaveCourt` | `0x3BA8098653902c5A5daf08f26A3759fB06C57a2A` | `4793E610064B36E68BFE551D1C06A2E7B26ECBDE174CE94066ABD065E8EF08F8` |
| `CaseWeaveSettlementReceiver` | `0x0F77E10770e5a12C0d2f9Bcc5fB077F44eA4257f` | `AC8B807454B877C28C9D9C368F56154809A58095450F7347AC0F7F2E9F293386` |
| `CaseWeaveJudgmentConsumer` | `0x08f0eeAFDd4Cf9ba9CD369AB2fCb25451db83211` | `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8` |

Deployer and court owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`.
`get_owner()` and the receiver/consumer trust bindings were read after
deployment and match this deployment identity. The deployed court source is
the exact `contracts/caseweave.py` byte content represented by the final
release source commit; the SHA-256 above was checked by the deployment script
against the finalized deployment receipt.

### Deployment transactions

- Receiver deploy: [0x187c4554707c4ed3c7dc13191ff35e07be725aeb4a13ad4351cad00cb27bf866](https://explorer-studio.genlayer.com/tx/0x187c4554707c4ed3c7dc13191ff35e07be725aeb4a13ad4351cad00cb27bf866)
- Court deploy: [0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef](https://explorer-studio.genlayer.com/tx/0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef)
- Consumer deploy: [0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805](https://explorer-studio.genlayer.com/tx/0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805)
- Court → receiver configuration: [0x6246465116127e626dce153a9d0078a1a74906c9b60f0335ed2444a364598c18](https://explorer-studio.genlayer.com/tx/0x6246465116127e626dce153a9d0078a1a74906c9b60f0335ed2444a364598c18)
- Receiver → court configuration: [0xa2ed141a52a8f51c59e7e33979be0c94a1842cb23882f9c02cc652b385dd31e2](https://explorer-studio.genlayer.com/tx/0xa2ed141a52a8f51c59e7e33979be0c94a1842cb23882f9c02cc652b385dd31e2)

Every deployment/configuration transaction was finalized with consensus
result `6` and GenVM execution `SUCCESS`.

## Canonical live evidence

The complete machine-readable record is
[`test-evidence/studionet-remediation-final-20261020.json`](test-evidence/studionet-remediation-final-20261020.json).
It contains 32 finalized application, consumer, custody, and expected-negative
transactions, full hashes, explorer URLs, GenVM results, object IDs, and
before/after reads.

The immutable delivery fixture is
[`docs/evidence/caseweave-counter-facts.txt`](docs/evidence/caseweave-counter-facts.txt)
at commit
[`abd9e03ab772e9ffddc35c1542c6e013470a93d5`](https://github.com/ometere123/caseweave/commit/abd9e03ab772e9ffddc35c1542c6e013470a93d5).
The successful proof recorded content hash
`fcfab26fc940c4ac093d8bb1ebad15ce9e27ec36ff7c42c858fdb96f8d67db23` and
authoritative GitHub API facts for repository `ometere123/caseweave`, the full
commit SHA, and exact changed-file membership.

## Full StudioNet sequence

All rows marked successful are `FINALIZED` with GenVM `SUCCESS`. The three
expected-negative rows are finalized rollback transactions whose protected
state was read before and after.

| # | Method / object | Transaction |
| ---: | --- | --- |
| 1 | `create_technical_agreement` → `AGR_1` | [0x9c396239c3c9254b84ca437e1eeb7fbc0986039d8421515b8aee93457c5261d2](https://explorer-studio.genlayer.com/tx/0x9c396239c3c9254b84ca437e1eeb7fbc0986039d8421515b8aee93457c5261d2) |
| 2 | `accept_agreement` → active | [0x2a76ddfe0f0504f5fdc9d84ec55b7ce8fa72539bb01d3ad7fb21b3ca03b0003e](https://explorer-studio.genlayer.com/tx/0x2a76ddfe0f0504f5fdc9d84ec55b7ce8fa72539bb01d3ad7fb21b3ca03b0003e) |
| 3 | `fund_agreement` → 1000 GEN | [0x6bfe18762efa1edf69101e727bfae1650de14bb3195af6e12501c5fc282274c8](https://explorer-studio.genlayer.com/tx/0x6bfe18762efa1edf69101e727bfae1650de14bb3195af6e12501c5fc282274c8) |
| 4 | `fund_milestone` → 900 GEN committed | [0x00d6d096f4e50f446f216c1584ddf5be3b6a0f9c9b4721a08cd069aab3af9c52](https://explorer-studio.genlayer.com/tx/0x00d6d096f4e50f446f216c1584ddf5be3b6a0f9c9b4721a08cd069aab3af9c52) |
| 5 | `submit_deliverable` | [0xdc955f25d8f80a595c6631075e2d444e465005083e5fc13096730571a49ebb60](https://explorer-studio.genlayer.com/tx/0xdc955f25d8f80a595c6631075e2d444e465005083e5fc13096730571a49ebb60) |
| 6 | `register_delivery_proof` → `PROOF_1` | [0x5ba9612b2c805f27437a3a48d2b3fd2b040d932fc299f7b00878dec3bf4afcd8](https://explorer-studio.genlayer.com/tx/0x5ba9612b2c805f27437a3a48d2b3fd2b040d932fc299f7b00878dec3bf4afcd8) |
| 7 | `verify_delivery_proof` → satisfied source facts | [0x78be1bef422b6b504aadb67828b3cb47d01582596b0749921e23fd03861f604a](https://explorer-studio.genlayer.com/tx/0x78be1bef422b6b504aadb67828b3cb47d01582596b0749921e23fd03861f604a) |
| 8 | `file_performance_dispute` → `DIS_1` | [0xe3326d469dfe2dcdba73722aac86888a2f012e4b97ce2a5a598200543291ffc2](https://explorer-studio.genlayer.com/tx/0xe3326d469dfe2dcdba73722aac86888a2f012e4b97ce2a5a598200543291ffc2) |
| 9 | `submit_response` | [0x0ba6080baf66fc9aabeae43b85e43d279578e8d1c7786c013fcb278af9b9bf71](https://explorer-studio.genlayer.com/tx/0x0ba6080baf66fc9aabeae43b85e43d279578e8d1c7786c013fcb278af9b9bf71) |
| 10 | `verify_evidence_url` → HTTP 200/hash | [0xf82469a8bd4b943879adcb583b1c8d2ede1b4d410505f3cb4fc5099753ef2ba0](https://explorer-studio.genlayer.com/tx/0xf82469a8bd4b943879adcb583b1c8d2ede1b4d410505f3cb4fc5099753ef2ba0) |
| 11 | `set_appeal_window` → immutable deadline | [0x06c0fa34d470f8e05bf3a1c3bab57b9246465753bbf08e3a68e9d0f3b6ef9e22](https://explorer-studio.genlayer.com/tx/0x06c0fa34d470f8e05bf3a1c3bab57b9246465753bbf08e3a68e9d0f3b6ef9e22) |
| 12 | `verify_evidence_url` → claimant snapshot | [0x1d0dc5a73bad54dafb0a542c3cc1100581b69d5631e600104a235c232e14ff31](https://explorer-studio.genlayer.com/tx/0x1d0dc5a73bad54dafb0a542c3cc1100581b69d5631e600104a235c232e14ff31) |
| 13 | `add_evidence` → deployment artifact | [0x1a330a2513a1ac48c20722a7d913097a60291e205e1f5ca7e4b0f1217ede6371](https://explorer-studio.genlayer.com/tx/0x1a330a2513a1ac48c20722a7d913097a60291e205e1f5ca7e4b0f1217ede6371) |
| 14 | `verify_evidence_url` → artifact verified | [0xa323694aabb35b7a6acabc58ad3f5e7321525dfbfdf727e942f2d7ff3c4d32fe](https://explorer-studio.genlayer.com/tx/0xa323694aabb35b7a6acabc58ad3f5e7321525dfbfdf727e942f2d7ff3c4d32fe) |
| 15 | `challenge_evidence` | [0x659f424e2331f889eda5616cf37aaa13753c54997749dc6e80270739fb667f5e](https://explorer-studio.genlayer.com/tx/0x659f424e2331f889eda5616cf37aaa13753c54997749dc6e80270739fb667f5e) |
| 16 | `verify_evidence_url` → counter-evidence | [0xa22c9d0f3fb12dcc610842e55f2ea509743c41c0a5f4526967e5fd50e9bafa21](https://explorer-studio.genlayer.com/tx/0xa22c9d0f3fb12dcc610842e55f2ea509743c41c0a5f4526967e5fd50e9bafa21) |
| 17 | `resolve_evidence_challenge` → semantic consensus | [0x4a8a9f506a15660c3a7ea3eacf067910718d44ccdddc77c6c49dbdbc3c5ab36c](https://explorer-studio.genlayer.com/tx/0x4a8a9f506a15660c3a7ea3eacf067910718d44ccdddc77c6c49dbdbc3c5ab36c) |
| 18 | `request_precedent_search` | [0xd70f67daac441482c3182fbeaee033aa15161453100b20acf4a4f28ca4fa8779](https://explorer-studio.genlayer.com/tx/0xd70f67daac441482c3182fbeaee033aa15161453100b20acf4a4f28ca4fa8779) |
| 19 | `request_verdict` → `claimant_wins` | [0x1aa5a6a85f0d6eab47dd68fa8798264bea9bfcbdf45a026936c5498cf73224cc](https://explorer-studio.genlayer.com/tx/0x1aa5a6a85f0d6eab47dd68fa8798264bea9bfcbdf45a026936c5498cf73224cc) |
| 20 | `finalize_precedent` → `CASE_1`, `JDG_1` | [0x328dd76054a2029dbfdcbbb6f92d6f7d6c6f8e69daf8e9fd54227ae25d81de5d](https://explorer-studio.genlayer.com/tx/0x328dd76054a2029dbfdcbbb6f92d6f7d6c6f8e69daf8e9fd54227ae25d81de5d) |
| 21 | `file_appeal` → `APP_1` | [0xf8ce26e24adb39b87b844984af07f51dcf425bb85fd1b150588fc86c1356560d](https://explorer-studio.genlayer.com/tx/0xf8ce26e24adb39b87b844984af07f51dcf425bb85fd1b150588fc86c1356560d) |
| 22 | unauthorized `resolve_appeal` → unchanged state | [0x7d685d0d17d5752639c0065c22717dd002a23993c59cc813d8c42b0b4ac47d1e](https://explorer-studio.genlayer.com/tx/0x7d685d0d17d5752639c0065c22717dd002a23993c59cc813d8c42b0b4ac47d1e) |
| 23 | `request_appeal_review` → `JDG_2`, version 2, affirmed | [0xdd0229932663d46e4c30513aebae331a871f4b767f6ec442931aad061334d94a](https://explorer-studio.genlayer.com/tx/0xdd0229932663d46e4c30513aebae331a871f4b767f6ec442931aad061334d94a) |
| 24 | `release_appeal_bond` → `TR_1`, custody callback | [0x38b8aa92e3a1e3670b13eff04a1c63cd19dd8f13c2df1ffcd9f407c78e31f289](https://explorer-studio.genlayer.com/tx/0x38b8aa92e3a1e3670b13eff04a1c63cd19dd8f13c2df1ffcd9f407c78e31f289) |
| 25 | fabricated appeal-bond `confirm_transfer` rejected | [0x2f4aa2ced672cbedb82ad5ab94fcd0611b04bc7a543246c5a00e1b5a8f29bf69](https://explorer-studio.genlayer.com/tx/0x2f4aa2ced672cbedb82ad5ab94fcd0611b04bc7a543246c5a00e1b5a8f29bf69) |
| 26 | `withdraw(TR_1)` → successful child | [0xceae844c7452ea615589829d82c4765c2e432347c122978c4db0ef0abe803a57](https://explorer-studio.genlayer.com/tx/0xceae844c7452ea615589829d82c4765c2e432347c122978c4db0ef0abe803a57) |
| 27 | `release_withdrawal_lock(TR_1)` → child recorded | [0x71276c72d2993e1a38791b90532232b4886bd1529607175a39f67f986287caa7](https://explorer-studio.genlayer.com/tx/0x71276c72d2993e1a38791b90532232b4886bd1529607175a39f67f986287caa7) |
| 28 | consumer `consume_judgment` → `JDG_2`, v2 | [0xccdc0e2e0d86d2e073a1af357fb5c184061d4a81f293ffddb48c2c7a28337875](https://explorer-studio.genlayer.com/tx/0xccdc0e2e0d86d2e073a1af357fb5c184061d4a81f293ffddb48c2c7a28337875) |
| 29 | `settle_judgment` → `TR_2`, 900 GEN | [0xe78408e8bdb53fe194c079f831465f131610ea2553c434926495e96db3e79575](https://explorer-studio.genlayer.com/tx/0xe78408e8bdb53fe194c079f831465f131610ea2553c434926495e96db3e79575) |
| 30 | fabricated settlement `confirm_transfer` rejected | [0x8904f983d7fb737d6d8a3bad9e564d77379dcc235a202b4cc0cb4688364b59d8](https://explorer-studio.genlayer.com/tx/0x8904f983d7fb737d6d8a3bad9e564d77379dcc235a202b4cc0cb4688364b59d8) |
| 31 | `withdraw(TR_2)` → successful child | [0x87698f3f355b0428775e81614d42676fedb08bda563987a9965a4a371c45d3d6](https://explorer-studio.genlayer.com/tx/0x87698f3f355b0428775e81614d42676fedb08bda563987a9965a4a371c45d3d6) |
| 32 | duplicate `settle_judgment` rejected | [0x9e62d42115a99b80e6cc0924125287430b5caca61eed09e846d9c3e07de9fb79](https://explorer-studio.genlayer.com/tx/0x9e62d42115a99b80e6cc0924125287430b5caca61eed09e846d9c3e07de9fb79) |

The `TR_2` custody child is
[0x8c7c865c33f1e5878629afe416e25a8196537793817bbbfcd4b5209c33f6d83f](https://explorer-studio.genlayer.com/tx/0x8c7c865c33f1e5878629afe416e25a8196537793817bbbfcd4b5209c33f6d83f)
and the trusted callback child is
[0x230f66b9537ea99db390d8306a119d53136d7d86a15377382ff2582422524eb7](https://explorer-studio.genlayer.com/tx/0x230f66b9537ea99db390d8306a119d53136d7d86a15377382ff2582422524eb7).
The receiver's EOA withdrawal status intentionally remains
`withdrawal_submitted`: pinned GenVM cannot independently query an external
EOA receipt, so the owner-recorded child hash only records the observation and
never marks court accounting as paid.

## Final state and security proofs

- Current judgment: `JDG_2`, version 2, `claimant_wins`, `affirmed`, closed;
  snapshot hash `374a04de9393f0780d2053c9223954bf59eec847d3650769c4da89a6cf730b1d`.
- Precedent: `CASE_1`, active, public, outcome `claimant_wins`.
- Settlement transfer: `TR_2`, 900 GEN, committed source, receiver custody
  reached only through the configured court callback.
- Final escrow read: `actual_deposited=1001`, `available=100`,
  `committed=0`, `reserved=0`, `pending_transfer=0`, `settled=901`,
  `failed_transfer_balance=0`, `contract_balance=100`,
  `total_accounted_assets=100`, `total_liabilities=100`, `solvent=true`.
- Consumer read: trusted court is the new court address; it stored `AGR_1`,
  `DIS_1`, `CASE_1`, `JDG_2`, version 2, the same snapshot hash, and outcome.
- Fabricated hashes and duplicate settlement finalized with GenVM `ERROR`;
  each before/after read remained unchanged.

## Production

The Vercel production variables were updated to the three addresses above and
chain `61999`. The final source push triggers the project's production deploy;
the alias is <https://caseweave.vercel.app>. Production verification must
confirm HTTP 200 for `/agreements/new`, the new court address in the client
bundle, the compiled `CalldataAddress` conversion, and absence of the
superseded address.

## Historical addresses

- `0x99be950790dEec2F474e5F6E55845eF75D8872a0` — prior corrected deployment.
- `0xBcD6A69Ca192528C65C67417BfE2dB7c2369215a` — superseded milestone
  deployment before this final adversarial remediation.

They are not active frontend targets.
