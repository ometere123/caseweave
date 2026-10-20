# Convert Chrome supervised E2E evidence

Status: **NOT RUN — awaiting user-supervised wallet testing.**

The required order is preserved: no Convert-profile browser session was opened
before implementation, automated gates, deployment, production verification,
commit, and freeze. No browser screenshot or wallet action is represented as
real evidence in this file.

## Planned roles

1. Deployment owner: read owner/trust bindings and, only where required,
   approve owner-only maintenance calls.
2. Party A: create the agreement, fund the approved milestone, submit delivery
   proof, and file an appeal when permitted.
3. Party B: accept, respond, challenge evidence, and inspect the case.
4. Third wallet: attempt the negative unauthorized appeal action without value.

## User-controlled actions

The user must switch wallets, approve connection requests, and approve or reject
wallet-extension transactions. Seed phrases, private keys, and wallet exports
must never be requested or captured.

Before any value-moving action, state the target contract, wallet role, exact
GEN amount, expected effect, and total approved test budget. Use StudioNet only.

## Required evidence per action

Record the production page, wallet role, contract method, full transaction hash,
finalized GenVM result, authoritative state read, expected/actual outcome, and
an explorer link. Distinguish pending, custodied, withdrawal-submitted, failed,
and externally verified delivery. Stop if production addresses or source do
not match [DEPLOYMENT.md](DEPLOYMENT.md).

This document will be completed only after the user explicitly supervises the
Convert Chrome session; it is not a substitute for that session.
