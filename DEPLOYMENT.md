# CaseWeave current StudioNet deployment

This is the source-matched closeout record for the appellate-remediation
deployment. It supersedes the earlier hardening deployment as active
configuration; earlier addresses remain historical provenance only.

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

The contract source was deployed from commit
[`645208b7eaa2a1efdc2c296f784b26f89d7a635e`](https://github.com/ometere123/caseweave/commit/645208b7eaa2a1efdc2c296f784b26f89d7a635e).
The final release commit also contains this evidence record and does not
change the deployed contract source.

## Active contracts and source parity

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| `CaseWeaveCourt` | `0x1FB9cA025916AA57A0bC221346cBD913282a5417` | `A453AC58196191D26AD7ECB86FAF042B590FC5489968CDBC81D5EE96C14D8278` |
| `CaseWeaveSettlementReceiver` | `0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D` | `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3` |
| `CaseWeaveJudgmentConsumer` | `0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C` | `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8` |

Deployment owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`.
On-chain reads returned that owner, the active court-to-receiver binding, the
active receiver-to-court binding, and the consumer's trusted court identity.

## Deployment and configuration receipts

- Court deployment: [0x47308f01c5845d09ed8e7f7ebc3b8d76c318a9cd68e2b90c7e46d1dfa58a68bd](https://explorer-studio.genlayer.com/tx/0x47308f01c5845d09ed8e7f7ebc3b8d76c318a9cd68e2b90c7e46d1dfa58a68bd)
- Receiver deployment: [0x6a19d408c41a145973cc6ad232db170fafb841338202d80c69755a41c94b691e](https://explorer-studio.genlayer.com/tx/0x6a19d408c41a145973cc6ad232db170fafb841338202d80c69755a41c94b691e)
- Court → receiver configuration: [0xcd014d2874b7a1fe01e3444a9aaac8291278dcca1bc819ea07830d1e9c4e2995](https://explorer-studio.genlayer.com/tx/0xcd014d2874b7a1fe01e3444a9aaac8291278dcca1bc819ea07830d1e9c4e2995)
- Receiver → court configuration: [0x902f1fb9bbd420b3cb82fcfd2d377a1ef06f7066422ccdd1699cefd60454e022](https://explorer-studio.genlayer.com/tx/0x902f1fb9bbd420b3cb82fcfd2d377a1ef06f7066422ccdd1699cefd60454e022)
- Consumer deployment: [0x3bb54c42551dbf409e25db02ee61b75eacf34b559c4e313a172f9f09829aa7f6](https://explorer-studio.genlayer.com/tx/0x3bb54c42551dbf409e25db02ee61b75eacf34b559c4e313a172f9f09829aa7f6)

Each deployment/configuration receipt finalized with GenVM execution
`SUCCESS`. A superseded consumer constructor attempt and an old-receiver
rebinding attempt failed closed; neither address is active.

## Successful live appellate-to-consumer lifecycle

Canonical machine-readable record:
[`test-evidence/studionet-final-appellate-remediation-20261027.json`](test-evidence/studionet-final-appellate-remediation-20261027.json).
It contains every transaction receipt, execution result, state read, child
transaction, and negative assertion from the fresh run. The run used the
active addresses above, two parties, the deployment owner, and an unrelated
third wallet.

The run produced `AGR_1`, `DIS_1`, `CASE_1`, first-instance `JDG_1`,
appellate `JDG_2`, and `APP_1`. Successful steps are linked below. Unless
marked `ERROR`, the receipt finalized with GenVM execution `SUCCESS` and
consensus status `FINALIZED`.

| # | Method and result | Transaction |
| ---: | --- | --- |
| 1 | `create_technical_agreement` → `AGR_1` | [0x7a14a47ea5e5de3db30993e99de0ac0f868fd7a45a4e3fc35ded4d60e403941e](https://explorer-studio.genlayer.com/tx/0x7a14a47ea5e5de3db30993e99de0ac0f868fd7a45a4e3fc35ded4d60e403941e) |
| 2 | `accept_agreement` | [0xf94dd5c8657e1bf496642ad5f3e6d97f4137c2c6fbff5c7aa100fd17b4d99dd9](https://explorer-studio.genlayer.com/tx/0xf94dd5c8657e1bf496642ad5f3e6d97f4137c2c6fbff5c7aa100fd17b4d99dd9) |
| 3 | `fund_agreement` → 1000 GEN | [0xffb28b007a751bcead76e73db7fc01972df4060907878efd3ae7c194c22525ec](https://explorer-studio.genlayer.com/tx/0xffb28b007a751bcead76e73db7fc01972df4060907878efd3ae7c194c22525ec) |
| 4 | `fund_milestone` → 900 GEN | [0x8079ad9fefddb560a601eff5b25ddea04e967ac087a8cb1e17cb97705303e14d](https://explorer-studio.genlayer.com/tx/0x8079ad9fefddb560a601eff5b25ddea04e967ac087a8cb1e17cb97705303e14d) |
| 5 | `submit_deliverable` | [0x35dd787c17c7d82296c718c7bdca929824278f5c0bd608b1779c8616bb4beba7](https://explorer-studio.genlayer.com/tx/0x35dd787c17c7d82296c718c7bdca929824278f5c0bd608b1779c8616bb4beba7) |
| 6 | `register_delivery_proof` → `PROOF_1` | [0xdcfc662086a4781fa38a0d45adb25c836acf69a3035ed1b520cfd37cc93ee058](https://explorer-studio.genlayer.com/tx/0xdcfc662086a4781fa38a0d45adb25c836acf69a3035ed1b520cfd37cc93ee058) |
| 7 | `verify_delivery_proof` → independently fetched source facts | [0x32a7c4ac8bcfdf347c94574e4125fd18ad7fdbaefeb10886d25d1a6d6f93d585](https://explorer-studio.genlayer.com/tx/0x32a7c4ac8bcfdf347c94574e4125fd18ad7fdbaefeb10886d25d1a6d6f93d585) |
| 8 | `file_performance_dispute` → `DIS_1` | [0x3eb128398aba0208b92741c8f36e508b2cb60116fd800b2d687ff248cca9b7db](https://explorer-studio.genlayer.com/tx/0x3eb128398aba0208b92741c8f36e508b2cb60116fd800b2d687ff248cca9b7db) |
| 9 | `submit_response` | [0x4af62b231b9f2173d5956705818807660dcd574b53dedf043307fe3436c9fd67](https://explorer-studio.genlayer.com/tx/0x4af62b231b9f2173d5956705818807660dcd574b53dedf043307fe3436c9fd67) |
| 10 | `verify_evidence_url` → respondent evidence | [0xd03fc3ae94581e1f5a5f930824f217b343164f88d588bdfbb46b75482ee63543](https://explorer-studio.genlayer.com/tx/0xd03fc3ae94581e1f5a5f930824f217b343164f88d588bdfbb46b75482ee63543) |
| 11 | `set_dispute_deadlines` → proposed | [0x021c92d1f48768bf6a29a6e7cb40235aa96673109767a0aaf7397ce6a444ffaa](https://explorer-studio.genlayer.com/tx/0x021c92d1f48768bf6a29a6e7cb40235aa96673109767a0aaf7397ce6a444ffaa) |
| 12 | `set_dispute_deadlines` → accepted | [0x5e337f5ed6ab8e94cb5e78f4ae790509a95dc2fbf44c8ffdb8093c7c7df2c4e6](https://explorer-studio.genlayer.com/tx/0x5e337f5ed6ab8e94cb5e78f4ae790509a95dc2fbf44c8ffdb8093c7c7df2c4e6) |
| 13 | `set_appeal_window` → proposed | [0x5388650603268b5e6afa3a2a45a92743cbd8a2646e0bf95d24e17150f795e406](https://explorer-studio.genlayer.com/tx/0x5388650603268b5e6afa3a2a45a92743cbd8a2646e0bf95d24e17150f795e406) |
| 14 | `set_appeal_window` → accepted | [0x02ebf98b25436ead0d58a13720962e83a7cf470e5cee983ad321dbcf4df9e312](https://explorer-studio.genlayer.com/tx/0x02ebf98b25436ead0d58a13720962e83a7cf470e5cee983ad321dbcf4df9e312) |
| 15 | `verify_evidence_url` → claimant snapshot | [0xafb4e690df47e5c951bf6ebca34b2552b6832886b9a01461d1722e5da26aff93](https://explorer-studio.genlayer.com/tx/0xafb4e690df47e5c951bf6ebca34b2552b6832886b9a01461d1722e5da26aff93) |
| 16 | `add_evidence` → GitHub commit metadata | [0xade2b93d23e72ab8afa78d50a29842ee42b937b7eeadd6d68bfe20d8c82b0191](https://explorer-studio.genlayer.com/tx/0xade2b93d23e72ab8afa78d50a29842ee42b937b7eeadd6d68bfe20d8c82b0191) |
| 17 | `verify_evidence_url` → source facts | [0xca82052c0cf99733cf30c3b9161e11826f5c4d5f15eb681c23f08e50f6955a09](https://explorer-studio.genlayer.com/tx/0xca82052c0cf99733cf30c3b9161e11826f5c4d5f15eb681c23f08e50f6955a09) |
| 18 | `challenge_evidence` | [0x4649f98f30ef7f12badd9459ac7663850a27998a372d4449bc8b3a50bfac2ece](https://explorer-studio.genlayer.com/tx/0x4649f98f30ef7f12badd9459ac7663850a27998a372d4449bc8b3a50bfac2ece) |
| 19 | `verify_evidence_url` → counter-evidence | [0xde839ec7c17d504f20e6554dfce27839487272548003af25e76bf3d0b697bd37](https://explorer-studio.genlayer.com/tx/0xde839ec7c17d504f20e6554dfce27839487272548003af25e76bf3d0b697bd37) |
| 20 | `resolve_evidence_challenge` | [0x02c2e21e1a6174d6eb01760bc2625af5dce7f7bc3061c89f979ec56b37018ccf](https://explorer-studio.genlayer.com/tx/0x02c2e21e1a6174d6eb01760bc2625af5dce7f7bc3061c89f979ec56b37018ccf) |
| 21 | `request_precedent_search` | [0x3bd939356c3643c0ede0ef19e13fc5f3bfa86483bd7a9ed1d8ed0c3b3bfba39b](https://explorer-studio.genlayer.com/tx/0x3bd939356c3643c0ede0ef19e13fc5f3bfa86483bd7a9ed1d8ed0c3b3bfba39b) |
| 22 | `request_verdict` → claimant wins | [0x2bffa6681242b02d51475f4027176848ade1bff43aabef38fd81e77d288da5d7](https://explorer-studio.genlayer.com/tx/0x2bffa6681242b02d51475f4027176848ade1bff43aabef38fd81e77d288da5d7) |
| 23 | `finalize_precedent` → `CASE_1`, `JDG_1` | [0xfac507340c69186121a257b56469b95245d88fe728ac1b9aac45470a6d309602](https://explorer-studio.genlayer.com/tx/0xfac507340c69186121a257b56469b95245d88fe728ac1b9aac45470a6d309602) |
| 24 | `file_appeal` → `APP_1` | [0xdde3438d56e9de52e32330adfdff2b31095bc6d655d0feabd9d29e7f5eb3dbc0](https://explorer-studio.genlayer.com/tx/0xdde3438d56e9de52e32330adfdff2b31095bc6d655d0feabd9d29e7f5eb3dbc0) |
| 25 | `add_appeal_evidence` | [0x2dccdc9152ff018c0544c6768e8c400d58acacae9ae92b6b7451b31c66c6e13f](https://explorer-studio.genlayer.com/tx/0x2dccdc9152ff018c0544c6768e8c400d58acacae9ae92b6b7451b31c66c6e13f) |
| 26 | `verify_evidence_url` → appellate evidence | [0xbefaaf604cb671072dfd06627f1726e1a729b56d8359dd9f6bded55ecdeae93d](https://explorer-studio.genlayer.com/tx/0xbefaaf604cb671072dfd06627f1726e1a729b56d8359dd9f6bded55ecdeae93d) |
| 27 | unauthorized `resolve_appeal` → unchanged, `ERROR` | [0x52bb8d61dc679298fcebb0e08bc877078034bbbad3bc6cd802c30efa25307aae](https://explorer-studio.genlayer.com/tx/0x52bb8d61dc679298fcebb0e08bc877078034bbbad3bc6cd802c30efa25307aae) |
| 28 | `request_appeal_review` → `SUCCESS`, `JDG_2` | [0x76511a2b07cffec85c087fb007330cfc52a027e6846164b3a83ba3b8d30f16d2](https://explorer-studio.genlayer.com/tx/0x76511a2b07cffec85c087fb007330cfc52a027e6846164b3a83ba3b8d30f16d2) |
| 29 | `release_appeal_bond` | [0x50562a72a9b88a346fa48b63792e3864f8824b59605ae8439752e661409ed48d](https://explorer-studio.genlayer.com/tx/0x50562a72a9b88a346fa48b63792e3864f8824b59605ae8439752e661409ed48d) |
| 30 | fabricated bond `confirm_transfer` → `ERROR` | [0x16cd419c907abd1552ed2d49dcb08a40cb0744e2429178b4691d111ee2796666](https://explorer-studio.genlayer.com/tx/0x16cd419c907abd1552ed2d49dcb08a40cb0744e2429178b4691d111ee2796666) |
| 31 | appeal-bond `withdraw` | [0xf3625c8788c84591946356fb831f2056cc6160b919ccdb539cc321b89171c367](https://explorer-studio.genlayer.com/tx/0xf3625c8788c84591946356fb831f2056cc6160b919ccdb539cc321b89171c367) |
| 32 | appeal-bond `release_withdrawal_lock` | [0x54be0b07cd8030c09c4b5a48dc7a87ad6acf81c893d0f942cdb3f83c627f6a73](https://explorer-studio.genlayer.com/tx/0x54be0b07cd8030c09c4b5a48dc7a87ad6acf81c893d0f942cdb3f83c627f6a73) |
| 33 | consumer `consume_judgment` → `JDG_2` | [0x2a6fc9f3706e231566d1bc1646901fbd4347721fb295b18777d6a3175fab2d48](https://explorer-studio.genlayer.com/tx/0x2a6fc9f3706e231566d1bc1646901fbd4347721fb295b18777d6a3175fab2d48) |
| 34 | `settle_judgment` → `TR_2`, 900 GEN | [0x649c4edeea364df73846c3cf65b83b6253613f1263ef1985c4b240cb293d8f76](https://explorer-studio.genlayer.com/tx/0x649c4edeea364df73846c3cf65b83b6253613f1263ef1985c4b240cb293d8f76) |
| 35 | fabricated settlement `confirm_transfer` → `ERROR` | [0xdc6634128fe4d2697331fd1e2c64d4ab09ac3f06600af8457d5a797379a6169c](https://explorer-studio.genlayer.com/tx/0xdc6634128fe4d2697331fd1e2c64d4ab09ac3f06600af8457d5a797379a6169c) |
| 36 | beneficiary `withdraw` → child finalized | [0x26f189e8cec2f0ba16dcb278c9168dbc665e80af46d70ddba0f17943beba2269](https://explorer-studio.genlayer.com/tx/0x26f189e8cec2f0ba16dcb278c9168dbc665e80af46d70ddba0f17943beba2269) |
| 37 | duplicate `settle_judgment` → `ERROR`, unchanged | [0x499a1076e2bee6f2870306ab333515bba730e5a9e775f912b909a0327f66c862](https://explorer-studio.genlayer.com/tx/0x499a1076e2bee6f2870306ab333515bba730e5a9e775f912b909a0327f66c862) |

The `settle_judgment` receipt finalized with GenVM `SUCCESS`, returned `TR_2`,
and created a successful custody child transaction
[0x1b704cbe0113035bfe336680a706af1a8309945a0e625d2d3fa0c3b86b1229d8](https://explorer-studio.genlayer.com/tx/0x1b704cbe0113035bfe336680a706af1a8309945a0e625d2d3fa0c3b86b1229d8).
The receiver readback was `custodied`, amount `900`, beneficiary
`0xA7EeAE0E93793e3146Cb14b0700251B8b0EBADFB`, and court equal to the active
court. The beneficiary withdrawal finalized with child transaction
[0x6c122a96bf5b07b75db8790b41c94929992a06f6ed73c265d25e83f3d46d7cfe](https://explorer-studio.genlayer.com/tx/0x6c122a96bf5b07b75db8790b41c94929992a06f6ed73c265d25e83f3d46d7cfe).
The on-chain custody record is `withdrawal_submitted`; this is intentionally
not described as an externally verified EOA receipt because the runtime does
not expose a cryptographic EOA receipt oracle. The protocol-level child
transaction finalized successfully and the record preserves that boundary.

The consumer record read after `consume_judgment` was:

```json
{
  "court_identity": "0x1FB9cA025916AA57A0bC221346cBD913282a5417",
  "agreement_id": "AGR_1",
  "dispute_id": "DIS_1",
  "case_id": "CASE_1",
  "judgment_id": "JDG_2",
  "version": 2,
  "outcome": "claimant_wins",
  "evidence_snapshot_hash": "43e7d16c0a1aaae00bf2efb6499a26abe6400133f076d65f4ee0387aadc07664"
}
```

Final state reads were `APP_1.status=resolved`, `JDG_2.status=finalized`,
`JDG_2.appeal_status=closed`, `JDG_2.supersedes=JDG_1`, `TR_2.status=custodied`,
and receiver custody `TR_2.status=withdrawal_submitted`. Court accounting after
settlement reported `total_accounted_assets=100`, `total_liabilities=100`,
`active_transfer_id=""`, and `solvent=true`.

## Negative evidence

- The unrelated wallet's `resolve_appeal` transaction above returned GenVM
  `ERROR` with `only the owner may access the administrative appeal guard`;
  before/after appeal, dispute, and precedent reads were identical.
- A fabricated all-ones `confirm_transfer` hash for the appeal bond returned
  `ERROR` and did not release custody.
- A fabricated all-ones `confirm_transfer` hash for `TR_2` returned `ERROR`
  and did not change the court transfer or receiver custody record.
- A duplicate `settle_judgment` returned GenVM `ERROR` with
  `judgment settlement has already been created`; the settled record stayed
  unchanged.

## Production verification

The Vercel production variables point exclusively to the three active
addresses and chain `61999`. The READY deployment was redeployed from the
existing `caseweave` project after those variables were corrected:

- Inspect: [Vercel deployment](https://vercel.com/delealufejoel-4184s-projects/caseweave/BjXErT9ifgCkKZtRJwLeMEr8kggX)
- Production: <https://caseweave.vercel.app>
- READY deployment URL: <https://caseweave-rkxw3okui-delealufejoel-4184s-projects.vercel.app>
- `GET /agreements/new`: HTTP `200`
- Live bundle contained the active Court, Receiver, and Consumer addresses and
  did not contain the superseded deployment addresses.
- GitHub Actions source gates for the pushed release source: [run 40442239265](https://github.com/ometere123/caseweave/actions/runs/40442239265),
  conclusion `success`, head `8e26bcc1dd3d8ece4f99681f8bb859e50b920cb7`.

## Historical deployments

The prior hardening addresses (`0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f`,
`0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7`, and
`0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488`) are retained in git history and
older evidence files for provenance only. They are not active frontend
configuration and must not be used as proof for this closeout.
