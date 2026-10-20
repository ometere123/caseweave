# CaseWeave Frontend

Next.js app for the CaseWeave GenLayer contract. The UI lets parties create
agreements, accept them, file disputes, verify evidence URLs through GenLayer
validators, request precedent search, request a verdict, finalize precedent,
and browse the resulting case memory graph.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and connect an injected wallet such as MetaMask or
Rabby. The wallet will be prompted to add GenLayer Studionet.

## Environment

Copy the root `.env.example` values into `app/.env.local` if you need to point
the frontend at a different deployment.

```bash
NEXT_PUBLIC_CASEWEAVE_CONTRACT_ADDRESS=0x3BA8098653902c5A5daf08f26A3759fB06C57a2A
NEXT_PUBLIC_CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS=0x0F77E10770e5a12C0d2f9Bcc5fB077F44eA4257f
NEXT_PUBLIC_CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS=0x08f0eeAFDd4Cf9ba9CD369AB2fCb25451db83211
NEXT_PUBLIC_STUDIONET_CHAIN_ID=61999
```

The committed default contract address is also defined in
`app/lib/contract.ts`, so the app works without a local env file for the
current Studionet deployment.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Project entry point and product overview |
| `/agreements` | Agreement docket |
| `/agreements/new` | Create a new agreement |
| `/agreements/[id]` | Agreement chamber: text, parties, disputes, related cases |
| `/disputes/[id]` | Courtroom: briefs, evidence verification, precedent search, verdict |
| `/cases` | Precedent library |
| `/cases/[id]` | Case memory detail, holding, treatment graph |
| `/graph` | Interactive precedent graph |
| `/appeals` | Appeal docket |
| `/profile` | Wallet-specific activity view |

## Contract Flow Exposed By The UI

1. Create an agreement with text, type, counterparty, stake, tags, and
   precedent policy.
2. Counterparty accepts the agreement.
3. Either party files a dispute and supplies evidence URLs.
4. Parties add more evidence as needed.
5. Evidence URLs are verified by the contract with GenLayer web fetching and
   validator consensus.
6. A precedent search identifies materially relevant prior cases.
7. A verdict can be requested only after at least one evidence item is
   verified.
8. Finalizing the verdict writes a reusable `PrecedentCase` into contract
   storage and records treatment of cited cases.
9. Appeals use bonded, versioned appellate review. The legacy
   `resolve_appeal` entry point is a fail-closed guard; merits outcomes come
   from `request_appeal_review` validator consensus.
10. The UI exposes structured delivery obligations, GitHub/source proof,
    evidence challenges, judgment versions, settlement balances, tracked child
    transfers, and explorer links. It does not present a transaction as
    successful until GenVM execution and finality are verified.

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
```

For contract deployment details, see the root `DEPLOYMENT.md`.
