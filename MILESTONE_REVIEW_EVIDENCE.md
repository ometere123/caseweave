# CaseWeave reviewer walkthrough

This is a reproducible review record for the final hardening source on
StudioNet chain `61999`. It distinguishes successful first-instance evidence
from the live appellate-consensus blocker.

## Deployed artifacts

- Court: `0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f`
- Receiver: `0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7`
- Judgment consumer: `0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Court SHA-256: `3FDDDA6866DA094D6F6055F3520DCC08523E9840B183BB63560B7908AD6D4EA0`
- Receiver SHA-256: `9D028AF74EA0458018C18351FB513C727BDDD3AB432DB25EABD82FAE91EE0CB3`
- Consumer SHA-256: `402BE27C006D12CF61C3F452EBF41887568EDFF8021E7596D76FF295BACB68C8`

Deployment receipts are listed in [DEPLOYMENT.md](DEPLOYMENT.md).

## Walkthrough

1. The frontend calldata builder uses the runtime SDK `CalldataAddress`
   constructor, not a TypeScript cast. The utility trims and validates exactly
   20 bytes and the tests inspect the SDK address tag and bytes.
2. The fresh live run created `AGR_2`, and on-chain reads matched the creator
   and counterparty. It was accepted, funded with 1000 GEN, and allocated a
   900 GEN milestone.
3. `verify_delivery_proof` independently fetched the GitHub commit API and the
   commit-pinned raw evidence. The exact SHA and changed-file membership were
   authenticated; green CI was supporting context only.
4. The run completed a dispute, response, evidence fetches, challenge,
   counter-evidence, semantic challenge resolution, precedent search, and a
   substantive first-instance verdict.
5. `finalize_precedent` created `CASE_1` and `JDG_1` with a frozen snapshot.
6. `APP_1` was filed with a bond and separately versioned appellate evidence
   was verified.
7. An unrelated wallet called `resolve_appeal`; the receipt was GenVM `ERROR`
   and before/after appeal, dispute, and precedent reads were identical:
   [rejected transaction](https://explorer-studio.genlayer.com/tx/0x693bad387ed7accff1ac82130e6f892de592b234e2e9bbd6f101f6c2b4b26a52).
8. The owner then submitted `request_appeal_review` five times. Every
   transaction finalized at the transaction layer but failed closed with
   `MAJORITY_DISAGREE`. No administrative result was selected and no settlement
   was attempted.

## Security conclusions supported by this run and local tests

- Fake child-hash confirmations are disabled; receiver custody is callback
  bound and EOA withdrawal remains explicitly `withdrawal_submitted` unless
  externally reconciled.
- Settlement code reads the current finalized judgment and validates bounded,
  role-bound remedies; it was not exercised live after the appellate blocker.
- Deadline fallback, frozen snapshots, pending-challenge gating, authoritative
  GitHub changed-file checks, semantic challenge consensus, and trusted-court
  consumer identity are covered behaviorally in Direct Mode.
- The appellate consensus blocker is honest and fail-closed; it is not hidden
  behind a mocked result or a privileged override.

Machine-readable live evidence:
[`test-evidence/studionet-final-release-hardening-e2e-final-20261020.json`](test-evidence/studionet-final-release-hardening-e2e-final-20261020.json).
