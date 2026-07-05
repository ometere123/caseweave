<p align="center">
  <img src="app/public/caseweave-logo.svg" alt="CaseWeave logo" width="140" />
</p>

# CaseWeave — Living Common-Law Memory for Web3 Agreements

Trustless, AI-consensus dispute resolution on GenLayer. Two parties enter an
agreement. A dispute is filed. GenLayer validators independently read the
agreement text, the evidence, and every prior similar case, then reach
consensus on a verdict — and that verdict becomes structured, reusable case
memory for the next dispute to confront. No human arbitrator, no opaque
committee, no case ever fully forgotten.

## What it is

Connect an injected wallet and draft an agreement — a freelance milestone, a
DAO grant, an agent-to-agent service contract, a creator collaboration, a
bounty, a governance mandate. Either party can file a dispute against that
agreement's text. GenLayer's validator network searches prior case memory,
reasons about which old cases are similar or distinguishable, and renders a
verdict with a reusable holding. That verdict is what future disputes are
judged against.

- **Case memory, not case-by-case rulings** — every finalized verdict becomes
  a `PrecedentCase`: a fact pattern, a legal issue, a holding, and a reasoning
  rule, plus how it treated the cases before it
- **AI consensus reasoning** — GenLayer validators independently evaluate the
  agreement, the claims, and prior precedent; `gl.eq_principle.prompt_comparative`
  enforces agreement on verdict category, precedent alignment, and affected
  case IDs before anything is written to state
- **Living treatment graph** — each new case can follow, distinguish, weaken,
  strengthen, or overturn the cases it cites, and that lineage is public and
  permanent
- **On-chain evidence, on-chain reasoning** — no database, no IPFS. Agreements,
  disputes, verdicts, and precedent all live in GenLayer contract storage

## How it works

### For agreement parties

1. Create an agreement — title, full text, counterparty address, agreement
   type, stake, precedent policy, tags
2. Counterparty accepts — the agreement becomes active
3. Either party can file a dispute against the agreement's text once it's
   active, with a claim summary, requested outcome, and evidence URLs
4. The other party submits a response with counter-evidence
5. Either party requests a **precedent search** — GenLayer surfaces
   materially relevant prior cases from the memory layer, or confirms none
   exist
6. Either party requests a **verdict** — validators weigh the agreement text,
   both briefs, the evidence, and the retrieved precedent, then reach
   consensus on an outcome and a reusable holding
7. Either party **finalizes the precedent** — the verdict becomes a permanent
   `PrecedentCase`, and every cited prior case has its treatment recorded
8. A dissatisfied party can **file an appeal** on a finalized dispute

### For the precedent layer

- Every case tracks a **precedent strength** (0–100, derived from validator
  confidence) and a status: `active`, `weakened`, `overturned`, `limited`, or
  `archived`
- Citing a case records a `CaseTreatment` — `followed`, `distinguished`,
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
band — not on the exact wording of the holding or reasoning.

Everything downstream of that consensus result — creating the `PrecedentCase`,
updating citation counts, marking prior cases `weakened` or `overturned`,
locking agreement and dispute status — runs as ordinary deterministic
contract code.

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
| `request_precedent_search(id)`  | Reads all active precedent for the agreement type, identifies materially relevant prior cases with similarity scores and distinguishing risks |
| `request_verdict(id)`           | Weighs the agreement text, both briefs, evidence, and retrieved precedent; produces a verdict, confidence, precedent alignment, case treatments, and a reusable holding |
| `finalize_precedent(id)`        | Deterministically turns a reached verdict into a permanent `PrecedentCase` and applies treatment effects to every cited case |
| `resolve_appeal(id, result)`    | Applies an appeal outcome — affirm, modify, reverse, weaken, or overturn the underlying precedent |

All non-deterministic outputs are validated against an allowed-value schema
inside the contract before being written to state.

## Contract

| Field      | Value                                                              |
|------------|---------------------------------------------------------------------|
| Network    | GenLayer Studionet                                                 |
| Chain ID   | 61999                                                               |
| RPC        | https://studio.genlayer.com/api                                    |
| Explorer   | https://genlayer-explorer.vercel.app                                |
| Contract   | `0xec393236E39578d19081687f2F27d801212f8194`                        |
| Source     | [contracts/caseweave.py](contracts/caseweave.py)                    |

See [DEPLOYMENT.md](DEPLOYMENT.md) for redeploy instructions and the local
test accounts used to run the reference dispute end-to-end.

## Tech stack

| Layer                | Tech                                                                 |
|-----------------------|----------------------------------------------------------------------|
| Intelligent contract  | GenLayer Python — `gl.nondet.exec_prompt`, `gl.eq_principle.prompt_comparative`, `TreeMap` / `@allow_storage` dataclass storage |
| Frontend              | Next.js 16 App Router · TypeScript · Tailwind CSS 4                 |
| Web3                  | `genlayer-js` 1.1.8 · viem                                          |
| Wallet                | Injected provider (MetaMask, Rabby, or any EIP-1193 wallet)          |
| Storage               | None — all state lives in the GenLayer contract                     |

## Repository

```
contracts/
  caseweave.py          GenLayer intelligent contract — all on-chain logic
app/
  app/                  Next.js pages
    agreements/          Agreement docket and creation
    agreements/[id]/     Agreement chamber — text, obligations, disputes, accept/file
    disputes/[id]/       Dispute courtroom — briefs, precedent bench, verdict engine
    cases/               Precedent library
    cases/[id]/          Case memory page — holding, treatment history, citation graph
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
etc.) — the app will prompt it to add GenLayer Studionet automatically.

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
