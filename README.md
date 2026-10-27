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

## Why this needs GenLayer

CaseWeave is not an AI advice app with a blockchain attached. The contract is
asked to resolve adversarial disputes where parties may disagree about what an
agreement required, whether evidence proves performance or breach, and how old
cases should affect the current outcome. That work needs validator consensus
because the result changes shared state: agreement status, dispute status,
precedent memory, and the treatment graph for future cases.

The contract does not simply check whether an LLM returned valid JSON. It
checks the disputed outcome itself: validators must independently fetch
evidence, agree on objective fetch data like HTTP status and content hash, and
then reach comparative consensus on verdict category, precedent alignment,
case IDs followed or distinguished, and confidence band before state changes.
Free-form wording can vary; the legally meaningful outcome cannot.

This is also why CaseWeave avoids judging claims from user-submitted text
alone. User-provided links are weak references until the contract verifies
them through GenLayer web fetching. A verdict cannot be requested until at
least one evidence item has been fetched, hashed, summarized, and marked
`verified`.

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

## Completed milestone capabilities

The current milestone integrates the existing courtroom with eight bounded
protocol capabilities: structured proof-of-performance agreements; authenticated
GitHub/raw evidence adapters and immutable challenges; fail-closed substantive
leader/validator checks; binding precedent policies and treatment history;
consensus appellate review with versioned judgments; funded GEN escrow with
tracked native child transfers; the CaseWeaveJudgmentConsumer interface; and
wallet-connected audit-oriented courtroom UX. The implementation is deliberately
bounded: external content is untrusted data, green CI is supporting context
only, and an evidence hash commits fetched bytes rather than proving source
truthfulness.

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
| `request_appeal_review(id)`     | Independently reassesses a finalized judgment through validator consensus and writes a versioned appellate decision |
| `resolve_appeal(id, result)`    | Fail-closed compatibility guard; it cannot choose or apply a merits outcome |
| `consume_judgment(...)`         | Second Intelligent Contract accepts only a current, finalized, scoped judgment |

All non-deterministic outputs are validated against an allowed-value schema
inside the contract before being written to state.

## Contract

| Field      | Value                                                              |
|------------|---------------------------------------------------------------------|
| Network    | GenLayer Studionet                                                 |
| Chain ID   | 61999                                                               |
| RPC        | https://studio.genlayer.com/api                                    |
| Explorer   | https://explorer-studio.genlayer.com                            |
| Contract   | `0x1FB9cA025916AA57A0bC221346cBD913282a5417`                    |
| Settlement receiver | `0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D`              |
| Judgment consumer | `0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C`              |
| Source     | [contracts/caseweave.py](contracts/caseweave.py)                    |

See [DEPLOYMENT.md](DEPLOYMENT.md) for the source-matched deployment, owner
role, transaction evidence, escrow design, redeploy instructions, and the
successful StudioNet appellate-to-settlement record. The production frontend
is [caseweave.vercel.app](https://caseweave.vercel.app). Live settlement and
consumer evidence is linked only where the receipt has a successful GenVM
execution result.

For the iteration record, see [PROJECT_HISTORY.md](PROJECT_HISTORY.md).

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
node_modules/.bin/genlayer.cmd deploy --contract contracts/caseweave.py
```

Then update `CASEWEAVE_CONTRACT_ADDRESS` in
[app/lib/contract.ts](app/lib/contract.ts).

Run the lightweight contract guardrail tests:

```bash
python -m unittest discover
```

## Disclaimer

CaseWeave provides AI-consensus dispute reasoning over agreement text and
evidence supplied by the parties. It is not legal advice and does not
constitute a binding legal judgment outside the terms the parties themselves
agreed to on-chain.
