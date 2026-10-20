# CaseWeave reviewer walkthrough

This is the concise, independently reproducible proof for the final
adversarial remediation on StudioNet chain `61999`. The full machine-readable
record is
[`test-evidence/studionet-remediation-final-20261020.json`](test-evidence/studionet-remediation-final-20261020.json);
the complete hash table is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Deployed artifacts

- Court: `0x3BA8098653902c5A5daf08f26A3759fB06C57a2A`
- Receiver: `0x0F77E10770e5a12C0d2f9Bcc5fB077F44eA4257f`
- Judgment consumer: `0x08f0eeAFDd4Cf9ba9CD369AB2fCb25451db83211`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court deployment: [0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef](https://explorer-studio.genlayer.com/tx/0x6794a8ffc05660e319b679d63ad78c8ab79ec703a6b8011bdf604f80944333ef)
- Court SHA-256: `4793E610064B36E68BFE551D1C06A2E7B26ECBDE174CE94066ABD065E8EF08F8`
- Consumer deployment: [0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805](https://explorer-studio.genlayer.com/tx/0x01056fb613afee39ecff9a161df8ec2048d4b95d7ea4247668164ce248f7f805)

## Reproduce the proof

1. The frontend creation builder calls the runtime SDK `CalldataAddress`
   constructor. It trims, validates exactly 20 bytes, rejects malformed,
   zero, and self addresses, and the frontend test checks the SDK address tag.
2. The live builder created `AGR_1`; the read-back stored the two distinct
   party addresses. It was accepted, funded with 1000 GEN, and allocated a
   900 GEN milestone.
3. `verify_delivery_proof` fetched the commit-pinned raw file and, through
   its source adapter, independently fetched GitHub commit metadata. The
   stored proof is `satisfied`; its facts match repository identity, full SHA
   `abd9e03ab772e9ffddc35c1542c6e013470a93d5`, and changed file
   `docs/evidence/caseweave-counter-facts.txt`.
4. A real dispute `DIS_1` was answered, evidence was fetched and hashed, a
   challenge was independently resolved, and the pending-challenge gate was
   satisfied before verdict.
5. `request_verdict` produced `claimant_wins`. Crucially, the immutable
   verdict snapshot includes the already authenticated delivery-proof facts,
   not just a user URL or LLM completion claim. `finalize_precedent` created
   `CASE_1` and `JDG_1`.
6. `APP_1` was filed with a 1-GEN bond. The third wallet's legacy
   `resolve_appeal` call finalized with GenVM `ERROR` and unchanged state:
   [rejected transaction](https://explorer-studio.genlayer.com/tx/0x7d685d0d17d5752639c0065c22717dd002a23993c59cc813d8c42b0b4ac47d1e).
   No wallet can select a merits result through that compatibility method.
7. The owner submitted `request_appeal_review`; independent appellate
   consensus produced `JDG_2`, version 2, result `affirmed`, outcome
   `claimant_wins`, and the same immutable snapshot hash. The owner did not
   choose the result.
8. The trusted consumer accepted only this court's finalized current judgment
   and stored `AGR_1`, `DIS_1`, `CASE_1`, `JDG_2`, version 2, and the court
   identity.
9. Settlement created `TR_2` for exactly 900 GEN from committed funds. The
   configured receiver emitted the exact-value custody callback only after
   the internal custody child finalized. Fabricated hashes were rejected:
   [bond](https://explorer-studio.genlayer.com/tx/0x2f4aa2ced672cbedb82ad5ab94fcd0611b04bc7a543246c5a00e1b5a8f29bf69)
   and [settlement](https://explorer-studio.genlayer.com/tx/0x8904f983d7fb737d6d8a3bad9e564d77379dcc235a202b4cc0cb4688364b59d8).
10. Final reads show `committed=0`, `pending_transfer=0`, `settled=901`,
    `total_accounted_assets=100`, `total_liabilities=100`, `solvent=true`.
    The beneficiary EOA withdrawal remains `withdrawal_submitted`; the
    receiver does not falsely mark external delivery as paid.

## Reviewer conclusions

- Fake child hashes cannot mark transfers delivered or reduce liabilities.
- Settlement uses the current finalized judgment and its canonical remedy.
- Partial/revision remedies are bounded; late funding on resolved agreements
  is rejected; remainder refunds and failed-transfer reconciliation are
  explicit.
- Historical evidence is frozen and appeals use the committed snapshot plus
  separately versioned verified evidence.
- GitHub authenticity uses authoritative commit metadata and changed-file
  membership, not a raw-file existence check.
- The judgment consumer is bound to the trusted court identity and
  court-scoped judgment namespace.

Production URL: <https://caseweave.vercel.app>. A READY deployment of the
remediation code
[GfeDzp9qqSxcHSe4exaytxDAM66G](https://vercel.com/delealufejoel-4184s-projects/caseweave/GfeDzp9qqSxcHSe4exaytxDAM66G)
is built from `c6bd1e9f59884a140f1a58ba05302290d457c491`. The production alias
returned HTTP 200 for `/agreements/new`; its client bundle contains the new
court address and compiled 20-byte `CalldataAddress` conversion, with no
superseded court address.
