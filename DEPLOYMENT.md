# CaseWeave - Deployment Reference

## Network

- **Network**: GenLayer Studio Network (studionet)
- **Chain ID**: 61999
- **RPC**: https://studio.genlayer.com/api
- **Explorer**: https://genlayer-explorer.vercel.app

## Deployed Contract

- **Contract**: `CaseWeaveCourt`
- **Address**: `0x322b999682CdDecE9b7e704541F86dC86D18D35a`
- **Source**: [contracts/caseweave.py](contracts/caseweave.py)

Redeploy with:

```bash
genlayer deploy --contract contracts/caseweave.py
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

`AGR_1` (evidence test bounty) → `DIS_1` (builder disputes claim of a
missing README) → three evidence URLs submitted: one real, commit-pinned
GitHub raw file; one `http://localhost:9999/fake` (correctly rejected as
`invalid_url` before any fetch); one nonexistent domain. The real URL was
verified: validators fetched it, agreed on HTTP 200 and one SHA-256 hash,
and produced a matching evidence summary and quote. `request_verdict` then
ran only because that verified item existed, correctly weighing it over the
claimant's own unverified/invalid links → verdict `no_breach`, 95%
confidence, explicitly citing the verified evidence as contradicting the
claimant's claim → finalized as `CASE_1`.

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

If evidence verification returns `unstable`, retry with a more stable source.
Dynamic pages, redirects, or pages that personalize responses can produce
different bytes for different validators.

## Frontend

- Next.js 16 App Router app in [app/](app/)
- `genlayer-js@1.1.8` client, injected wallet support (MetaMask, Rabby, etc.)
- Run locally: `npm run dev --prefix app` (port 3000)
