# CaseWeave reviewer remediation

Status: remediation implemented, deployed, and exercised on StudioNet.

## Original findings and fixes

1. `create_agreement` declared `counterparty: Address`, but the creation
   page passed the form value as a JavaScript string. `genlayer-js@1.1.8`
   therefore encoded it with the string calldata tag; GenVM later tried to
   deserialize it as an address and raised `AttributeError: 'str' object has
   no attribute 'as_bytes'`.
2. `resolve_appeal` had no caller authorization. Any wallet could submit an
   appeal result and change the status of a consensus-created precedent.

The frontend now uses the runtime `CalldataAddress` class from
`genlayer-js/types`. `app/lib/address.ts` trims and validates a strict
20-byte hexadecimal address, rejects zero addresses and self-reference, and
constructs the class from exactly 20 bytes. `buildCreateAgreementArgs` is the
single argument builder used by the creation page. Tests confirm the runtime
class, bytes, and SDK address calldata tag (`0x18`), not merely a TypeScript
assertion.

The contract stores `owner` from `gl.message.sender_address` at deployment,
exposes read-only `get_owner()`, and requires that owner at the start of
`resolve_appeal`. It then validates the appeal, result, dispute status, and
linked precedent before changing any state. Resolved appeals cannot be
resolved again, and there is no owner-transfer method. This owner is an
explicitly trusted app-level administrative resolver; appeal outcomes are not
represented as fresh validator-consensus judgments. Initial dispute search,
evidence verification, and verdict creation remain GenLayer consensus flows.

The shared frontend write helper now waits for SDK finality and checks the
`genlayer-js@1.1.8` execution fields (`txExecutionResultName` and the leader
receipt's `execution_result`). A finalized transaction with GenVM failure is
shown as an error with its hash and StudioNet explorer link. Agreement
navigation occurs only after the receipt return and an authoritative on-chain
agreement read match the submitted values.

## Corrected deployment

- Network: `studionet`, chain ID `61999`
- RPC: <https://studio.genlayer.com/api>
- Contract: `0x99be950790dEec2F474e5F6E55845eF75D8872a0`
- Deployment transaction: <https://explorer-studio.genlayer.com/tx/0x99aa01c15af3d8fb9acc1deca9ce79339335f09df26b34b83ae14a983134d412>
- Owner confirmed by `get_owner()`: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Contract source SHA-256: `8B0140180C121BD7414C3878462DBD04E39CCEB507E749C2E97A2B73A7E764E3`
- Source commit: `8b95829`

The deployment receipt reached `FINALIZED`, its result was majority agree, and
the leader GenVM result was `SUCCESS`. The deployed schema contains the
`counterparty` parameter as `address`, `get_owner` as a read-only method, and
owner-gated `resolve_appeal`.

## Verification results

Commands run against the pinned local toolchain:

```text
node_modules/.bin/genlayer.cmd --version                       0.39.1
genlayer-js (root and app)                                    1.1.8
python -m unittest discover -v                                 6 passed
gltest ... test/test_caseweave_direct.py -v -s                2 passed
npm run test:frontend                                          16 passed
app/node_modules/.bin/tsc.cmd --noEmit -p app/tsconfig.json    passed
npm run lint --prefix app                                      passed
npm run build --prefix app                                     passed
GENVM_VERSION=v0.2.16 genvm-lint check contracts/caseweave.py  passed
```

`genvm-lint==0.11.0` reported only the contract's pre-existing bare
`Exception` warnings; lint, schema extraction, and semantic validation passed.
The linter's default newest cached bundle did not contain this contract's
existing `py-genlayer` hash, so compatibility was verified with the cached
`v0.2.16` bundle via `GENVM_VERSION=v0.2.16`; the contract header and runner
hash were not changed. The direct execution suite uses the installed
`genlayer-test==0.29.2` runtime.

## Genuine StudioNet workflow

All successful transactions below were `FINALIZED` with GenVM `SUCCESS`.
The object IDs and states were read back from the deployed contract.

| Method | Object/state | Explorer transaction |
|---|---|---|
| `create_agreement` | `AGR_1`; creator and counterparty stored as the two party wallets | <https://explorer-studio.genlayer.com/tx/0x952a9b26e9b7e4bca4355e417c59a83a2dd432acb372f5a4217bd9bbeb07edc6> |
| `accept_agreement` | `AGR_1: pending_acceptance -> active` | <https://explorer-studio.genlayer.com/tx/0x82229107931dd9088ae017c69070011a9e794fbfd24e9b430ce040544c65c31a> |
| `file_dispute` | `DIS_1: awaiting_response` | <https://explorer-studio.genlayer.com/tx/0x652ab929491d5d6450bdbbe6eccd4efb2369bab9430de8d640d920b0be0bf09e> |
| `submit_response` | `DIS_1: awaiting_precedent_search` | <https://explorer-studio.genlayer.com/tx/0x867c46d563d38488e9ce3f402104d3bd00275a1685db658ab8c3c7e6bb73c428> |
| `verify_evidence_url` | `verified`, HTTP 200, content hash `c51f97ba5175f0a4b975f08e67833d8d4e377b60b100e120ed1d6236c399a6fc` | <https://explorer-studio.genlayer.com/tx/0xda9e21daffed42a8be5ef5e87f49eed007bca000967be9af028eb2e75b49c9da> |
| `request_precedent_search` | `DIS_1: awaiting_verdict` | <https://explorer-studio.genlayer.com/tx/0x37a289da16f695ef30ff06bd3bc4b0f6fc438dc76532bfe416210ba5eb76a50f> |
| `request_verdict` | AI consensus: `revision_required`, confidence 74; `DIS_1: verdict_reached` | <https://explorer-studio.genlayer.com/tx/0x821459b52f9822faa0e830b036cddf223101dd73a41bddc6f8a0c3881b55d446> |
| `finalize_precedent` | `CASE_1`; `DIS_1: finalized` | <https://explorer-studio.genlayer.com/tx/0x21b183d9d4badaf5a1c7728efceb58d28dfe0a3dd9be2c5d2f1e291c60aaf4b6> |
| `file_appeal` | `APP_1: under_review`; `DIS_1: under_appeal` | <https://explorer-studio.genlayer.com/tx/0x4f365ba23ede9d4127b0160fe4dc07cd700ce753676b90c062659b1bd1bba35c> |
| `resolve_appeal` by unrelated third wallet | Expected `ERROR`: `only the owner may resolve appeals`; appeal, dispute, and precedent reads were unchanged | <https://explorer-studio.genlayer.com/tx/0xf3420dee8c597fe72012c8aca02612955bf555a7248593f18247dada50347c10> |
| `resolve_appeal` by owner | `APP_1: resolved`, result `overturned_precedent`; `CASE_1: overturned` | <https://explorer-studio.genlayer.com/tx/0x687616edced6a55483960167c695c891d17fc3ec14bb7a385876ba78c7ab2fff> |

Evidence was fetched from the immutable URL
<https://raw.githubusercontent.com/ometere123/caseweave/3916d4a/README.md>.
The recorded on-chain content hash proves the validator fetch was part of the
successful evidence-verification transaction; the evidence was not mocked in
this run. The resulting `CASE_1` is available through the frontend's cases
route at `/cases/CASE_1` when connected to the corrected deployment.

## Production status and limitations

The repository default, `.env.example`, app README, and deployment references
all point to the corrected contract and chain 61999. Vercel production is
verified and ready:

- Deployment: <https://vercel.com/delealufejoel-4184s-projects/caseweave/HJadkTVa48pmnMqFEn8T1PzZvrt4>
- Live alias: <https://caseweave.vercel.app>
- Deployment ID: `dpl_HJadkTVa48pmnMqFEn8T1PzZvrt4`
- Build source: `9527876`
- Live `/agreements/new` response: HTTP 200
- Live client chunk: `/_next/static/chunks/0gqdo_07n01tk.js` contains the
  corrected contract address, strict address validation, and the compiled
  `Uint8Array.from({ length: 20 }, ...)` runtime `CalldataAddress`
  construction used by the create-agreement builder.

No private keys, keystores, or credentials are stored in the repository.

## Resubmission response

> CaseWeave has been remediated and redeployed to StudioNet (chain 61999).
> The creation path now constructs a runtime `CalldataAddress`, and tests
> verify the SDK address calldata tag and 20-byte payload. Appeal resolution is
> owner-authorized on-chain, validates the linked finalized precedent before
> mutation, rejects duplicate resolution, and has no owner-transfer path. The
> corrected contract is `0x99be950790dEec2F474e5F6E55845eF75D8872a0`.
> A real StudioNet run created `AGR_1`, accepted it, progressed through
> evidence fetching, precedent search, AI consensus, and `CASE_1` finalization,
> then filed `APP_1`; an unrelated wallet was rejected and the verified owner
> resolved the appeal. Explorer links and state/hash evidence are recorded in
> this report.
