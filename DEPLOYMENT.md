# CaseWeave — Deployment Reference

## Network

- **Network**: GenLayer Studio Network (studionet)
- **Chain ID**: 61999
- **RPC**: https://studio.genlayer.com/api
- **Explorer**: https://genlayer-explorer.vercel.app

## Deployed Contract

- **Contract**: `CaseWeaveCourt`
- **Address**: `0xec393236E39578d19081687f2F27d801212f8194`
- **Source**: [contracts/caseweave.py](contracts/caseweave.py)

Redeploy with:

```bash
genlayer deploy --contract contracts/caseweave.py
```

Then update `CASEWEAVE_CONTRACT_ADDRESS` in [app/lib/contract.ts](app/lib/contract.ts).

## Test Accounts (studionet, local keystores)

Keystores live in `~/.genlayer/keystores/`. Do not reuse these keys anywhere
with real value — they are local development keys only.

| Name    | Address                                      | Role in demo scenario |
|---------|-----------------------------------------------|------------------------|
| default | 0x59060326ec4079baee01006d56ec0f560f1a9f14    | unused / spare |
| party_a | 0xac3ac69dc0bde389256dd6748c75817ead9286d9    | DAO (agreement creator, claimant) |
| party_b | 0xa7eeae0e93793e3146cb14b0700251b8b0ebadfb    | Builder (counterparty, respondent) |

Switch active account: `genlayer account use <name>`
Unlock: `genlayer account unlock --account <name> --password <password>`

## Verified real-data run

`AGR_1` (DAO Frontend Build Grant) → `DIS_1` (refund dispute over incomplete
wallet connection) → precedent search (no prior cases, correctly reasoned) →
verdict (`revision_required`, 95% confidence) → finalized as `CASE_1`, the
first precedent in the memory layer.

## Frontend

- Next.js 16 App Router app in [app/](app/)
- `genlayer-js@1.1.8` client, injected wallet support (MetaMask, Rabby, etc.)
- Run locally: `npm run dev --prefix app` (port 3000)
