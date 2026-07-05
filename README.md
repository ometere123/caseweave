<p align="center">
  <img src="app/public/caseweave-logo.svg" alt="CaseWeave logo" width="140" />
</p>

# CaseWeave - Living Common-Law Memory for Web3 Agreements

Trustless, AI-consensus dispute resolution on GenLayer. Two parties enter an
agreement. A dispute is filed. GenLayer validators independently read the
agreement text, the evidence, and every prior similar case, then reach
consensus on a verdict - and that verdict becomes structured, reusable case
memory for the next dispute to confront. No human arbitrator, no opaque
committee, no case ever fully forgotten.

## What it is

Connect an injected wallet and draft an agreement - a freelance milestone, a
DAO grant, an agent-to-agent service contract, a creator collaboration, a
bounty, a governance mandate. Either party can file a dispute against that
agreement's text. GenLayer's validator network searches prior case memory,
reasons about which old cases are similar or distinguishable, and renders a
verdict with a reusable holding. That verdict is what future disputes are
judged against.

- **Case memory, not case-by-case rulings** - every finalized verdict becomes
  a `PrecedentCase`: a fact pattern, a legal issue, a holding, and a reasoning
  rule, plus how it treated the cases before it
- **AI consensus reasoning** - GenLayer validators independently evaluate the
  agreement, the claims, and prior precedent; `gl.eq_principle.prompt_comparative`
  enforces agreement on verdict category, precedent alignment, and affected
  case IDs before anything is written to state
- **Living treatment graph** - each new case can follow, distinguish, weaken,
  strengthen, or overturn the cases it cites, and that lineage is public and
  permanent
- **On-chain evidence, on-chain reasoning** - no database, no IPFS. Agreements,
  disputes, verdicts, and precedent all live in GenLayer contract storage
- **Fetched and verified evidence, not just links** - CaseWeave does not
  merely store URLs. It asks GenLayer validators to independently fetch each
  evidence link, hash the response, and summarize only the dispute-relevant
  facts found there - then resolves the dispute using those verified
  evidence records, not the raw links

## How it works

### For agreement parties

1. Create an agreement - title, full text, counterparty address, agreement
   type, stake, precedent policy, tags
2. Counterparty accepts - the agreement becomes active
3. Either party can file a dispute against the agreement's text once it's
   active, with a claim summary, requested outcome, and evidence URLs
4. The other party submits a response with counter-evidence
5. Either party can **verify an evidence URL** - a GenLayer validator
   consensus round independently fetches it, hashes the response body, and
   extracts a dispute-relevant summary (see [Evidence verification](#evidence-verification-not-just-links))
6. Either party requests a **precedent search** - GenLayer surfaces
   materially relevant prior cases from the memory layer, or confirms none
   exist
7. Either party requests a **verdict** - this requires at least one verified
   evidence item; validators weigh the agreement text, both briefs, the
   *verified* evidence, and the retrieved precedent, then reach consensus on
   an outcome and a reusable holding
8. Either party **finalizes the precedent** - the verdict becomes a permanent
   `PrecedentCase`, and every cited prior case has its treatment recorded
9. A dissatisfied party can **file an appeal** on a finalized dispute

### For the precedent layer

- Every case tracks a **precedent strength** (0–100, derived from validator
  confidence) and a status: `active`, `weakened`, `overturned`, `limited`, or
  `archived`
- Citing a case records a `CaseTreatment` - `followed`, `distinguished`,
  `strengthened`, `weakened`, `overturned`, or `cited_for_context`
- Overturned cases stay visible for historical context; the UI never hides
  weakened, overturned, or bad-faith outcomes

## Non-deterministic reasoning, deterministic storage

`request_precedent_search` and `request_verdict` run inside GenVM
non-deterministic blocks driven by `gl.nondet.exec_prompt`. Because free-form
legal reasoning will never produce byte-identical text across validators,
agreement is enforced with `gl.eq_principle.prompt_comparative` against an
explicit equivalence principle: validators must agree on the verdict
category, the precedent alignment category, the same set of followed /
distinguished / weakened / overturned case IDs, and a matching confidence
band - not on the exact wording of the holding or reasoning.

Everything downstream of that consensus result - creating the `PrecedentCase`,
updating citation counts, marking prior cases `weakened` or `overturned`,
locking agreement and dispute status - runs as ordinary deterministic
contract code.

The same determinism concern applies to timestamps: a normal
`datetime.now()` call would differ per validator and break consensus, so
every timestamp field (`created_at`, `filed_at`, `resolved_at`, etc.) is
stamped from `gl.message_raw["datetime"]` - GenVM's transaction-pinned clock,
which every validator sees identically.

## Evidence verification, not just links

Early versions of CaseWeave stored evidence as raw URL strings and dropped
the URL list into the verdict prompt as text. That let the LLM reason from
a URL string, never from what was actually at that URL - which defeats the
point of building this on GenLayer at all.

`verify_evidence_url(dispute_id, side, evidence_index)` closes that gap.
Every validator independently:

1. Fetches the URL with `gl.nondet.web.request(url, method="GET")`
2. SHA-256 hashes the raw response body
3. If the fetch failed (HTTP 4xx/5xx), records `failed_fetch` - this does
   not revert the transaction, it's stored as a real outcome
4. Otherwise, asks an LLM to extract only the dispute-relevant facts from
   the fetched content into a short summary and quote

All of this - the objective HTTP status and content hash, and the
subjective summary - is settled in one `gl.eq_principle.prompt_comparative`
round: validators must agree **exactly** on `http_status` and
`content_hash` (they fetched the same bytes or they didn't), while
`evidence_summary` and `short_quote` only need to agree in meaning, not
wording.

Only the hash, status, a short summary, and a short quote are stored
on-chain - never the full page. The URL stays available for a human to open
directly.

Evidence statuses: `unverified` (submitted, not yet fetched), `verified`
(fetched, hashed, and summarized), `failed_fetch` (validators agree the URL
was unreachable), `invalid_url` (rejected before any fetch - non-`https`,
localhost, or private-IP hosts), `unstable` (validators couldn't reach
comparative agreement), `not_relevant` (fetched successfully but the
content had nothing to do with the dispute).

`request_verdict` will not run until at least one evidence item across
either side is `verified`, and the verdict prompt explicitly instructs
validators to weight evidence accordingly: verified evidence carries real
weight, unverified links are treated as weak references only, and failed or
invalid URLs are treated as no proof of the underlying claim at all - never
as support for it.

Filing a dispute or submitting a response never blocks on fetching - URLs
are stored immediately and validated for shape only (`https://`, no
localhost/private hosts, length cap). A bad link doesn't stop a dispute from
being filed; it just can't be verified. Use commit-pinned URLs (raw GitHub
with a commit hash, not a branch name) where possible, so content stays
byte-identical across every validator's fetch.

## Round lifecycle

```
DRAFT (pending_acceptance) -> ACTIVE -> DISPUTED -> RESOLVED
```

| Dispute status              | What happens                                                        |
|------------------------------|----------------------------------------------------------------------|
| `awaiting_response`          | Claimant has filed; respondent has not yet replied                  |
| `awaiting_precedent_search`  | Response submitted; either party may request the precedent search   |
| `awaiting_verdict`           | Precedent search complete; either party may request the verdict     |
| `verdict_reached`            | Validators have decided; either party may finalize the precedent    |
| `finalized`                  | Case memory created; agreement marked resolved                      |
| `under_appeal`               | A party has filed an appeal against the finalized verdict            |

## GenLayer consensus functions

| Function                        | What GenLayer does                                                              |
|----------------------------------|-----------------------------------------------------------------------------------|
| `verify_evidence_url(dispute_id, side, index)` | Fetches the evidence URL, SHA-256 hashes the body, and extracts a dispute-relevant summary - see [Evidence verification](#evidence-verification-not-just-links) |
| `request_precedent_search(id)`  | Reads all active precedent for the agreement type, identifies materially relevant prior cases with similarity scores and distinguishing risks |
| `request_verdict(id)`           | Weighs the agreement text, both briefs, *verified* evidence, and retrieved precedent; produces a verdict, confidence, precedent alignment, case treatments, and a reusable holding |
| `finalize_precedent(id)`        | Deterministically turns a reached verdict into a permanent `PrecedentCase` and applies treatment effects to every cited case |
| `resolve_appeal(id, result)`    | Applies an appeal outcome - affirm, modify, reverse, weaken, or overturn the underlying precedent |

All non-deterministic outputs are validated against an allowed-value schema
inside the contract before being written to state.

## Contract

| Field      | Value                                                              |
|------------|---------------------------------------------------------------------|
| Network    | GenLayer Studionet                                                 |
| Chain ID   | 61999                                                               |
| RPC        | https://studio.genlayer.com/api                                    |
| Explorer   | https://genlayer-explorer.vercel.app                                |
| Contract   | `0x322b999682CdDecE9b7e704541F86dC86D18D35a`                        |
| Source     | [contracts/caseweave.py](contracts/caseweave.py)                    |

See [DEPLOYMENT.md](DEPLOYMENT.md) for redeploy instructions and the local
test accounts used to run the reference dispute end-to-end.

## Tech stack

| Layer                | Tech                                                                 |
|-----------------------|----------------------------------------------------------------------|
| Intelligent contract  | GenLayer Python - `gl.nondet.exec_prompt`, `gl.eq_principle.prompt_comparative`, `TreeMap` / `@allow_storage` dataclass storage |
| Frontend              | Next.js 16 App Router · TypeScript · Tailwind CSS 4                 |
| Web3                  | `genlayer-js` 1.1.8 · viem                                          |
| Wallet                | Injected provider (MetaMask, Rabby, or any EIP-1193 wallet)          |
| Storage               | None - all state lives in the GenLayer contract                     |

## Repository

```
contracts/
  caseweave.py          GenLayer intelligent contract - all on-chain logic
app/
  app/                  Next.js pages
    agreements/          Agreement docket and creation
    agreements/[id]/     Agreement chamber - text, obligations, disputes, accept/file
    disputes/[id]/       Dispute courtroom - briefs, precedent bench, verdict engine
    cases/               Precedent library
    cases/[id]/          Case memory page - holding, treatment history, citation graph
    graph/               Interactive precedent graph
    appeals/             Appeal docket
    profile/             User case history
  lib/                  genlayer-js client + contract type wrappers
  components/           AgreementFolderCard, PrecedentBench, VerdictPanel,
                         TreatmentBadge, HoldingPanel, CitationGraph,
                         ObligationLens, EvidenceRail, and more
  store/                Zustand wallet store (persisted, silent reconnect)
```

## Getting started

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000. Connect an injected wallet (MetaMask, Rabby,
etc.) - the app will prompt it to add GenLayer Studionet automatically.

To redeploy the contract:

```bash
genlayer deploy --contract contracts/caseweave.py
```

Then update `CASEWEAVE_CONTRACT_ADDRESS` in
[app/lib/contract.ts](app/lib/contract.ts).

## Disclaimer

CaseWeave provides AI-consensus dispute reasoning over agreement text and
evidence supplied by the parties. It is not legal advice and does not
constitute a binding legal judgment outside the terms the parties themselves
agreed to on-chain.
