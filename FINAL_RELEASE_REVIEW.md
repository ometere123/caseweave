# CaseWeave final release review

## Current status

Implementation, deterministic automated gates, source push, and production
deployment are complete for the focused release hardening. The tested source
is now frozen; supervised Convert testing is intentionally not run.

## Release identity

- Baseline: `21063992ffedda2495874ef98b658ddf10f01a4c`
- Tested/deployed source commit: `0fcd95e905696be8c75eca3708b152c9566119a0`
- Final evidence commit: this release-documentation commit; its exact SHA is
  reported in the final handoff.
- Git status: clean after the evidence commit, apart from preserved local
  historical evidence artifacts that are intentionally not release inputs
- Network: StudioNet, chain `61999`
- Court: `0x357688E5fc8D433eb2De071fE9ceeDf93eBB024f`
- Receiver: `0xeF7c04C58716e00F090b2C9ec305BDae86E0D4F7`
- Consumer: `0x9E4Ecf45C0B356bDc46731A4B862ab3E7Ffa2488`
- Owner: `0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`
- Source hashes and deployment receipts: [DEPLOYMENT.md](DEPLOYMENT.md)

## Gates

Passed locally: 18 pytest tests, 6 unittest tests, GenVM lint/schema for all
three contracts, 22 Vitest tests, TypeScript, ESLint, Next.js production build
(11 routes), and 2 local Playwright tests. The final live record is in
[TEST_EVIDENCE.md](TEST_EVIDENCE.md).

## Live evidence and blocker

The final-address StudioNet run proved agreement creation/acceptance/funding,
typed parties, commit-pinned source verification, evidence challenges,
first-instance consensus, `CASE_1`/`JDG_1` finalization, legitimate `APP_1`,
and rejection of an unrelated `resolve_appeal` with unchanged state.

All five bounded `request_appeal_review` attempts returned finalized
transaction receipts with GenVM `MAJORITY_DISAGREE`. This is the remaining
release blocker: no appellate decision, settlement, custody withdrawal, or
consumer consumption is claimed from this fresh run. The contract correctly
failed closed and no additional blind retry is authorized.

## Production

Vercel production variables are set to the active contract addresses and chain
`61999`. The tested source commit was deployed successfully:

- Deployment: `dpl_7BFnjrpVkXuN6gDzsVDfrCwRVRyw`
- Inspect: https://vercel.com/delealufejoel-4184s-projects/caseweave/7BFnjrpVkXuN6gDzsVDfrCwRVRyw
- Ready deployment: https://caseweave-mm0al2rky-delealufejoel-4184s-projects.vercel.app
- Production alias: https://caseweave.vercel.app
- HTTP verification: `/agreements/new` returned `200`.
- Bundle verification: the live bundle contains the active Court address,
  the `Enter a valid 20-byte wallet address.` guard, `Uint8Array` conversion,
  and the active Receiver/Consumer addresses; it contains neither the
  superseded Court address nor an untyped string-only address path.
- CI: https://github.com/ometere123/caseweave/actions/runs/39475875319

The Convert Chrome profile remains untouched.

## Reviewer assessment

The security fixes are implemented and locally verified. Contract Quality and
Engineering hardening are supported by behavioral tests and source identity
proof. GenLayer Fit remains the locked 4/5 target. Frontend/UX automated gates
pass, but the required supervised wallet session and a successful live
appellate-consensus-to-settlement run remain outstanding; no 5/5 claim is made.
