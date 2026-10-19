# CaseWeave - Deployment Reference

## Network

- **Network**: GenLayer Studio Network (studionet)
- **Chain ID**: 61999
- **RPC**: https://studio.genlayer.com/api
- **Explorer**: https://explorer-studio.genlayer.com

## Deployed Contract

- **Contract**: `CaseWeaveCourt`
- **Address**: `0x99be950790dEec2F474e5F6E55845eF75D8872a0`
- **Deployment transaction**: [0x99aa01c15af3d8fb9acc1deca9ce79339335f09df26b34b83ae14a983134d412](https://explorer-studio.genlayer.com/tx/0x99aa01c15af3d8fb9acc1deca9ce79339335f09df26b34b83ae14a983134d412)
- **Owner**: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- **Contract source SHA-256**: `8B0140180C121BD7414C3878462DBD04E39CCEB507E749C2E97A2B73A7E764E3`
- **Source**: [contracts/caseweave.py](contracts/caseweave.py)

The owner is an explicitly trusted app-level administrative resolver for
appeals. `resolve_appeal` is not a fresh validator-consensus judgment: the
owner submits the administrative result on-chain, while the initial dispute
verdict remains consensus-created. There is no owner-transfer method.

Redeploy with:

```bash
node_modules/.bin/genlayer.cmd deploy --contract contracts/caseweave.py
```

Then update `CASEWEAVE_CONTRACT_ADDRESS` in [app/lib/contract.ts](app/lib/contract.ts).

Redeploying always produces a new address with empty state - GenLayer has no
in-place contract upgrade in this setup. Any storage/schema change requires a
fresh deploy and re-running the demo data.

### Prior deployments (superseded)

- `0xCdB3EDb59f582bdbDcf6fe153ed79E7b5290dc49` - v2, added real on-chain
  timestamps, but evidence was still raw URL strings passed into the verdict
  prompt as text, never actually fetched.
- `0xec393236E39578d19081687f2F27d801212f8194` - v1, first working deploy;
  `created_at`/`updated_at`/etc. are all placeholder zeros.
- `0x322b999682CdDecE9b7e704541F86dC86D18D35a` - superseded remediation
  target; the old frontend passed counterparty strings and appeal resolution
  was not owner-authorized.

Kept here for reference only; the frontend no longer points at either.

## On-chain timestamps

Every write that creates or transitions an object stamps it with
`gl.message_raw["datetime"]` - GenVM's transaction-pinned clock, which every
validator sees identically, so it's safe to use in deterministic contract
code (unlike a normal `time.time()`/`datetime.now()` call, which would differ
per validator and break consensus). Fields:

- `Agreement.created_at` / `updated_at`
- `Dispute.filed_at` / `responded_at` / `resolved_at`
- `PrecedentCase.created_at`
- `Appeal.filed_at` / `resolved_at`
- `EvidenceItem.verified_at`

`list_recent_precedents` sorts by `created_at`, and the Precedent Library's
date-range filter and "Recently created" sort in the frontend both use these
real values.

## Evidence fetching (v3)

`file_dispute`/`submit_response`/`add_evidence` store each URL as an
`EvidenceItem` (composite key `{dispute_id}:{side}:{index}`) with status
`unverified` or `invalid_url` - validated for shape only (`https://`, no
localhost/private-IP hosts, length cap), never fetched at submission time, so
one bad link never blocks filing a dispute.

`verify_evidence_url(dispute_id, side, evidence_index)` is where the real
work happens: every validator independently calls
`gl.nondet.web.request(url, method="GET")`, SHA-256 hashes the response
body, and (if the fetch succeeded) asks an LLM to extract only the
dispute-relevant facts. All of it settles in one
`gl.eq_principle.prompt_comparative` round - exact agreement required on
`http_status` and `content_hash`, loose agreement on the summary/quote
wording.

`request_verdict` now hard-requires at least one `verified` evidence item
(across either side) before it will run, and the verdict prompt is
explicitly instructed to weight verified evidence over unverified links and
to treat failed/invalid URLs as no proof at all.

**Implementation note worth keeping**: the GenLayer docs and several
examples reference `response.status_code` on the object returned by
`gl.nondet.web.request`. On the studionet build behind this deployment, that
attribute doesn't exist - the real attribute is `response.status`. Confirmed
empirically by deploying a throwaway probe contract that did
`",".join(dir(response))` inside a `strict_eq` block, which returned
`body,headers,status`. If evidence verification starts throwing
`AttributeError` after a GenVM upgrade, check this first before assuming the
contract logic is wrong.

## Test Accounts (studionet, local keystores)

Keystores live in `~/.genlayer/keystores/`. Do not reuse these keys anywhere
with real value - they are local development keys only.

| Name    | Address                                      | Role in demo scenario |
|---------|-----------------------------------------------|------------------------|
| default | 0x59060326ec4079baee01006d56ec0f560f1a9f14    | unused / spare |
| party_a | 0xac3ac69dc0bde389256dd6748c75817ead9286d9    | DAO (agreement creator, claimant) |
| party_b | 0xa7eeae0e93793e3146cb14b0700251b8b0ebadfb    | Builder (counterparty, respondent) |

Switch active account: `genlayer account use <name>`
Unlock: `genlayer account unlock --account <name> --password <password>`

## Verified real-data run (current deployment)

The following run used the corrected frontend calldata builder and two party
accounts, plus a third unrelated wallet for the authorization rejection. Every
listed transaction reached `FINALIZED`; the GenVM execution result was
`SUCCESS` except the expected unauthorized rejection, which reached
`FINALIZED` with GenVM `ERROR` and left state unchanged.

| Step | Object/state | Transaction |
|---|---|---|
| Create typed-address agreement | `AGR_1`; creator `0xac3AC69dC0Bde389256dD6748C75817ead9286D9`, counterparty `0xA7EeAE0E93793e3146Cb14b0700251B8b0EBADFB` | [0x952a9b26e9b7e4bca4355e417c59a83a2dd432acb372f5a4217bd9bbeb07edc6](https://explorer-studio.genlayer.com/tx/0x952a9b26e9b7e4bca4355e417c59a83a2dd432acb372f5a4217bd9bbeb07edc6) |
| Accept | `AGR_1: pending_acceptance -> active` | [0x82229107931dd9088ae017c69070011a9e794fbfd24e9b430ce040544c65c31a](https://explorer-studio.genlayer.com/tx/0x82229107931dd9088ae017c69070011a9e794fbfd24e9b430ce040544c65c31a) |
| File dispute | `DIS_1: awaiting_response` | [0x652ab929491d5d6450bdbbe6eccd4efb2369bab9430de8d640d920b0be0bf09e](https://explorer-studio.genlayer.com/tx/0x652ab929491d5d6450bdbbe6eccd4efb2369bab9430de8d640d920b0be0bf09e) |
| Respond | `DIS_1: awaiting_response -> awaiting_precedent_search` | [0x867c46d563d38488e9ce3f402104d3bd00275a1685db658ab8c3c7e6bb73c428](https://explorer-studio.genlayer.com/tx/0x867c46d563d38488e9ce3f402104d3bd00275a1685db658ab8c3c7e6bb73c428) |
| Verify evidence | `verified`, HTTP 200, SHA-256 `c51f97ba5175f0a4b975f08e67833d8d4e377b60b100e120ed1d6236c399a6fc` | [0xda9e21daffed42a8be5ef5e87f49eed007bca000967be9af028eb2e75b49c9da](https://explorer-studio.genlayer.com/tx/0xda9e21daffed42a8be5ef5e87f49eed007bca000967be9af028eb2e75b49c9da) |
| Precedent search | `DIS_1: awaiting_verdict` | [0x37a289da16f695ef30ff06bd3bc4b0f6fc438dc76532bfe416210ba5eb76a50f](https://explorer-studio.genlayer.com/tx/0x37a289da16f695ef30ff06bd3bc4b0f6fc438dc76532bfe416210ba5eb76a50f) |
| AI-consensus verdict | `revision_required`, confidence 74; `DIS_1: verdict_reached` | [0x821459b52f9822faa0e830b036cddf223101dd73a41bddc6f8a0c3881b55d446](https://explorer-studio.genlayer.com/tx/0x821459b52f9822faa0e830b036cddf223101dd73a41bddc6f8a0c3881b55d446) |
| Finalize | `CASE_1`; `DIS_1: finalized` | [0x21b183d9d4badaf5a1c7728efceb58d28dfe0a3dd9be2c5d2f1e291c60aaf4b6](https://explorer-studio.genlayer.com/tx/0x21b183d9d4badaf5a1c7728efceb58d28dfe0a3dd9be2c5d2f1e291c60aaf4b6) |
| File appeal | `APP_1: under_review`; `DIS_1: under_appeal` | [0x4f365ba23ede9d4127b0160fe4dc07cd700ce753676b90c062659b1bd1bba35c](https://explorer-studio.genlayer.com/tx/0x4f365ba23ede9d4127b0160fe4dc07cd700ce753676b90c062659b1bd1bba35c) |
| Unauthorized resolver | Third wallet rejected with `only the owner may resolve appeals`; `APP_1`, `DIS_1`, and `CASE_1` unchanged | [0xf3420dee8c597fe72012c8aca02612955bf555a7248593f18247dada50347c10](https://explorer-studio.genlayer.com/tx/0xf3420dee8c597fe72012c8aca02612955bf555a7248593f18247dada50347c10) |
| Owner resolution | `APP_1: resolved`, result `overturned_precedent`; `CASE_1: overturned` | [0x687616edced6a55483960167c695c891d17fc3ec14bb7a385876ba78c7ab2fff](https://explorer-studio.genlayer.com/tx/0x687616edced6a55483960167c695c891d17fc3ec14bb7a385876ba78c7ab2fff) |

Evidence URL: `https://raw.githubusercontent.com/ometere123/caseweave/3916d4a/README.md`.
The final on-chain reads confirmed `AGR_1`, `DIS_1`, `CASE_1`, and `APP_1`
and the owner address shown above.

## Reproduce the demo flow

Use two Studionet accounts, one as the agreement creator and one as the
counterparty.

1. Start the frontend with `npm run dev --prefix app`.
2. Connect the creator wallet and open `/agreements/new`.
3. Create an agreement with a concrete deliverable, a counterparty address,
   an agreement type such as `bounty` or `freelance`, and `public_precedent`
   as the precedent policy.
4. Switch to the counterparty wallet and open the created agreement page.
5. Accept the agreement. Expected agreement status: `active`.
6. As either party, file a dispute with at least one stable `https://` evidence
   URL. Prefer a commit-pinned raw GitHub URL or another static page so every
   validator fetches identical bytes.
7. Open `/disputes/[id]`. Expected dispute status: `awaiting_response`.
8. Switch to the respondent wallet and submit a response with any
   counter-evidence URLs. Expected dispute status: `awaiting_precedent_search`.
9. In each evidence rail, verify at least one evidence item. Expected evidence
   status for a good static URL: `verified`, with HTTP status and content hash
   visible in the UI.
10. Request precedent search. Expected dispute status: `awaiting_verdict`.
11. Request verdict. The button is disabled until at least one evidence item is
    verified. Expected dispute status after consensus: `verdict_reached`.
12. Finalize precedent. Expected dispute status: `finalized`; expected
    agreement status: `resolved`; expected result: a new `CASE_n` visible in
    `/cases` and the case detail page.
13. File an appeal from a finalized dispute. Only the deployment owner may
    resolve it; the owner action is administrative and does not claim fresh
    validator consensus.

If evidence verification returns `unstable`, retry with a more stable source.
Dynamic pages, redirects, or pages that personalize responses can produce
different bytes for different validators.

## Frontend

- Next.js 16 App Router app in [app/](app/)
- `genlayer-js@1.1.8` client, injected wallet support (MetaMask, Rabby, etc.)
- Run locally: `npm run dev --prefix app` (port 3000)
