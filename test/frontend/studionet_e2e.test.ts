import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Wallet } from "ethers";
import { expect, it } from "vitest";
import {
  createAccount,
  createClient,
  chains,
} from "../../app/node_modules/genlayer-js/dist/index.js";
import { TransactionStatus } from "../../app/node_modules/genlayer-js/dist/types/index.js";
import {
  buildCreateTechnicalAgreementArgs,
  buildRegisterDeliveryProofArgs,
} from "../../app/lib/contract";
import { toCalldataAddress } from "../../app/lib/address";
import {
  extractTransactionReturnString,
  getExecutionError,
  getExplorerTxUrl,
  type ReceiptLike,
} from "../../app/lib/genlayer";
import { resolveCreatedAgreementId } from "../../app/lib/create-agreement";

const CONTRACT_ADDRESS =
  process.env.CASEWEAVE_E2E_CONTRACT_ADDRESS ??
  "0x1FB9cA025916AA57A0bC221346cBD913282a5417";
const RECEIVER_ADDRESS =
  process.env.CASEWEAVE_E2E_RECEIVER_ADDRESS ??
  "0xfA5E9553cf1a25dD7541C4Bd59A89cfe30f2860D";
const CONSUMER_ADDRESS =
  process.env.CASEWEAVE_E2E_CONSUMER_ADDRESS ??
  "0xB5a8F24A6B6CaEF7e71A7A1C365eD991b39B298C";
const EVIDENCE_COMMIT =
  process.env.CASEWEAVE_E2E_COMMIT_SHA ??
  "afb440fef324d09de6db12f40804ae9dce815c6e";
const EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_EVIDENCE_URL ??
  `https://raw.githubusercontent.com/ometere123/caseweave/${EVIDENCE_COMMIT}/docs/evidence/caseweave-delivery.md`;
const COUNTER_EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_COUNTER_EVIDENCE_URL ??
  `https://raw.githubusercontent.com/ometere123/caseweave/${EVIDENCE_COMMIT}/docs/evidence/caseweave-counter-facts.txt`;
const SOURCE_FACTS_EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_SOURCE_FACTS_EVIDENCE_URL ??
  `https://api.github.com/repos/ometere123/caseweave/commits/${EVIDENCE_COMMIT}`;
const CHALLENGE_EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_CHALLENGE_EVIDENCE_URL ??
  SOURCE_FACTS_EVIDENCE_URL;
const APP_EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_APP_EVIDENCE_URL ??
  "https://caseweave.vercel.app";

const EVIDENCE_CHANGED_FILES = [
  ".env.example",
  "README.md",
  "THREAT_MODEL.md",
  "app/README.md",
  "app/app/agreements/[id]/AgreementChamberClient.tsx",
  "app/app/disputes/[id]/DisputeCourtroomClient.tsx",
  "app/lib/contract.ts",
  "contracts/caseweave.py",
  "contracts/caseweave_settlement_receiver.py",
  "test-evidence/studionet-final-release-hardening-deploy-20261020.json",
  "test/frontend/studionet_e2e.test.ts",
  "test/test_caseweave_milestone_direct.py",
];

const RPC_METADATA_TIMEOUT_MS = 15_000;
const FINALITY_TIMEOUT_MS = 180_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type AccountName = "owner" | "party_a" | "party_b" | "third";

function loadAccount(name: AccountName) {
  const directory = process.env.CASEWEAVE_E2E_KEYS_DIR;
  const password = process.env.CASEWEAVE_E2E_KEY_PASSWORD;
  if (!directory || !password) {
    throw new Error(
      "CASEWEAVE_E2E_KEYS_DIR and CASEWEAVE_E2E_KEY_PASSWORD are required",
    );
  }
  const keyFile = {
    owner: "praest-deployer.json",
    party_a: "party_a.json",
    party_b: "party_b.json",
    third: "slash-owner.json",
  }[name];
  const keystore = readFileSync(`${directory}/${keyFile}`, "utf8");
  const privateKey = Wallet.fromEncryptedJsonSync(keystore, password)
    .privateKey as `0x${string}`;
  return createAccount(privateKey);
}

function lastId(map: unknown, label: string): string {
  if (!map || typeof map !== "object") {
    throw new Error(`${label} did not return an object map`);
  }
  const ids = Object.keys(map as Record<string, unknown>).sort();
  if (ids.length === 0) throw new Error(`${label} returned no records`);
  return ids[ids.length - 1];
}

function futureUtc(seconds: number): string {
  return new Date(Date.now() + seconds * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function leaderReceipt(receipt: any) {
  return (
    receipt.consensus_data?.leader_receipt?.find(
      (item: any) => item.mode === "leader",
    ) ?? receipt.consensus_data?.leader_receipt?.[0]
  );
}

function mergedReceipt(waited: any, full: any): ReceiptLike {
  return {
    ...waited,
    ...(full ?? {}),
    consensus_data: full?.consensus_data ?? waited?.consensus_data,
  } as ReceiptLike;
}

async function getTransactionWithRetry(client: any, hash: string, attempts = 12) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withTimeout(
        client.getTransaction({ hash: hash as any }),
        RPC_METADATA_TIMEOUT_MS,
        `getTransaction(${hash})`,
      );
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * (attempt + 1), 5000)),
        );
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to retrieve transaction metadata");
}

async function waitForFinalizedReceipt(client: any, hash: string, attempts = 4) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withTimeout(
        client.waitForTransactionReceipt({
          hash: hash as any,
          status: TransactionStatus.FINALIZED,
          retries: 60,
          interval: 3000,
        }),
        FINALITY_TIMEOUT_MS,
        `waitForTransactionReceipt(${hash})`,
      );
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1500 * (attempt + 1), 5000)),
        );
      }
    }
  }
  throw new Error(
    `Transaction ${hash} could not be read to finality after retries: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function readCase(client: any, functionName: string, args: any[] = []) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < 8) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * (attempt + 1), 5000)),
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("StudioNet read failed");
}

async function readReceiver(client: any, functionName: string, args: any[] = []) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await client.readContract({
        address: RECEIVER_ADDRESS,
        functionName,
        args,
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < 8) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * (attempt + 1), 5000)),
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("StudioNet receiver read failed");
}

async function readConsumer(
  client: any,
  functionName: string,
  args: any[] = [],
) {
  if (!CONSUMER_ADDRESS) {
    throw new Error(
      "CASEWEAVE_E2E_CONSUMER_ADDRESS is required for the cross-contract proof",
    );
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await client.readContract({
        address: CONSUMER_ADDRESS,
        functionName,
        args,
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < 8) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * (attempt + 1), 5000)),
        );
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("StudioNet consumer read failed");
}

async function triggered(client: any, hash: string): Promise<string[]> {
  return (await withTimeout(
    client.getTriggeredTransactionIds({ hash }),
    RPC_METADATA_TIMEOUT_MS,
    `getTriggeredTransactionIds(${hash})`,
  ).catch(() => [])) as string[];
}

async function send(
  label: string,
  client: any,
  account: any,
  address: string,
  functionName: string,
  args: any[],
  evidence: any[],
  value: bigint = 0n,
  expectSuccess = true,
) {
  console.log(`[StudioNet] ${label}`);
  const hash = await client.writeContract({
    account,
    address,
    functionName,
    args,
    value,
  });
  const waited = await waitForFinalizedReceipt(client, hash);
  const full = await getTransactionWithRetry(client, hash).catch(() => null);
  const receipt = mergedReceipt(waited, full);
  const leader = leaderReceipt(receipt);
  const executionResult = leader?.execution_result ?? "UNKNOWN";
  const executionError = getExecutionError(receipt);
  const childTransactionIds = await triggered(client, hash);
  const item = {
    label,
    contract: address,
    method: functionName,
    hash,
    explorer: getExplorerTxUrl(hash),
    consensusStatus: receipt.statusName ?? receipt.status,
    resultName: receipt.resultName ?? receipt.result,
    executionResult,
    executionResultName: receipt.txExecutionResultName,
    executionError,
    consensusFinal: receipt.consensus_data?.final ?? null,
    leaderResult: leader?.result ?? null,
    triggeredTransactionIds: childTransactionIds,
  };
  evidence.push(item);

  if (expectSuccess && executionError) {
    throw new Error(
      `${label} finalized without successful GenVM execution: ${JSON.stringify(item)}`,
    );
  }
  if (!expectSuccess && !executionError) {
    throw new Error(`${label} unexpectedly succeeded: ${JSON.stringify(item)}`);
  }

  console.log(`[StudioNet] ${label} finalized ${hash} (${executionResult})`);

  return { hash, receipt, item, childTransactionIds };
}

function isRetryableConsensusFailure(error: unknown): boolean {
  const message = String(error);
  return message.includes("MAJORITY_DISAGREE") || message.includes("TIMEOUT");
}

async function waitForTriggered(
  client: any,
  parentHash: string,
  attempts = 30,
): Promise<string[]> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ids = await triggered(client, parentHash);
    if (ids.length > 0) return ids;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return [];
}

async function waitForSuccessfulChild(client: any, parentHash: string, label: string) {
  const childIds = await waitForTriggered(client, parentHash);
  if (childIds.length === 0) {
    throw new Error(`${label} finalized without a tracked child transaction`);
  }
  const childHash = childIds[0];
  const waited = await waitForFinalizedReceipt(client, childHash);
  const full = await getTransactionWithRetry(client, childHash).catch(() => null);
  const receipt = mergedReceipt(waited, full);
  const error = getExecutionError(receipt);
  if (error) throw new Error(`${label} child ${childHash} failed: ${error}`);
  return { childHash, receipt, childIds };
}

it(
  "completes the structured CaseWeave workflow on StudioNet",
  async () => {
    const evidence: any[] = [];
    const outputPath = process.env.CASEWEAVE_E2E_OUTPUT;
    const state: any = {
      network: "studionet",
      chainId: 61999,
      rpc: "https://studio.genlayer.com/api",
      contract: CONTRACT_ADDRESS,
      receiver: RECEIVER_ADDRESS,
      consumer: CONSUMER_ADDRESS ?? null,
      evidenceUrl: EVIDENCE_URL,
      transactions: evidence,
    };
    const writeOutput = () => {
      if (!outputPath) return;
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
    };

    const owner = loadAccount("owner");
    const partyA = loadAccount("party_a");
    const partyB = loadAccount("party_b");
    const third = loadAccount("third");
    const ownerClient = createClient({ chain: chains.studionet, account: owner });
    const partyAClient = createClient({ chain: chains.studionet, account: partyA });
    const partyBClient = createClient({ chain: chains.studionet, account: partyB });
    const thirdClient = createClient({ chain: chains.studionet, account: third });

    try {
      expect((await readCase(ownerClient, "get_owner")) as string).toBe(owner.address);
      expect((await readCase(ownerClient, "get_settlement_receiver")) as string).toBe(RECEIVER_ADDRESS);
      expect((await readReceiver(ownerClient, "get_trusted_court")) as string).toBe(CONTRACT_ADDRESS);
      expect((await readConsumer(ownerClient, "get_trusted_court")) as string).toBe(CONTRACT_ADDRESS);

      const commitSha = EVIDENCE_COMMIT;
      const repositoryUrl = "https://github.com/ometere123/caseweave";
      const expectedAgreement = {
        creator: partyA.address,
        counterparty: partyB.address,
        title: "CaseWeave verifiable software delivery",
        agreementText:
          "The developer must deliver a commit-pinned, repository-authenticated software artifact that satisfies the committed acceptance criteria.",
        agreementType: "freelance",
        tags: ["software", "proof-of-performance", "studionet"],
        stakeAmount: 1000,
        precedentPolicy: "public_precedent",
        acceptanceCriteria:
          "The committed repository identity, immutable commit and delivery artifact must be independently verifiable; green CI alone is not sufficient.",
        obligations: [
          {
            id: "obligation-1",
            text: "Deliver a repository-authenticated software artifact at the committed source revision.",
          },
        ],
        deliverables: [
          {
            id: "deliverable-1",
            description: "Commit-pinned source artifact with provenance metadata.",
          },
        ],
        milestones: [
          {
            name: "Authenticated delivery",
            obligation_id: "obligation-1",
            acceptance_criteria:
              "The source identity and immutable commit must match the agreement.",
            deadline: "2099-12-31T23:59:59Z",
            amount: 900,
          },
        ],
        repositoryUrl,
        sourcePolicy:
          "Allowlisted GitHub HTTPS sources with commit-pinned raw evidence and independent validator retrieval.",
        completionConditions:
          "A final judgment must settle or safely reconcile the committed milestone funds.",
      };

      const agreementsBefore = await readCase(partyAClient, "list_agreements");
      const created = await send(
        "create structured agreement through the frontend calldata builder",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "create_technical_agreement",
        buildCreateTechnicalAgreementArgs(expectedAgreement),
        evidence,
      );
      const agreementId = await resolveCreatedAgreementId({
        hash: created.hash,
        receipt: created.receipt,
        expected: expectedAgreement,
        readAgreement: async (id) =>
          (await readCase(partyAClient, "get_agreement", [id])) as any,
        listAgreements: async () =>
          (await readCase(partyAClient, "list_agreements")) as any,
      });
      const agreementAfterCreate = await readCase(partyAClient, "get_agreement", [agreementId]);
      const specAfterCreate = await readCase(partyAClient, "get_agreement_spec", [agreementId]);
      expect(agreementAfterCreate.creator.toLowerCase()).toBe(partyA.address.toLowerCase());
      expect(agreementAfterCreate.counterparty.toLowerCase()).toBe(partyB.address.toLowerCase());
      expect(specAfterCreate.commitment_hash).toMatch(/^[0-9a-f]{64}$/);
      state.agreementId = agreementId;
      state.states = { agreementsBefore, agreementAfterCreate, specAfterCreate };

      await send(
        "accept agreement as counterparty",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "accept_agreement",
        [agreementId],
        evidence,
      );
      const agreementAfterAccept = await readCase(partyBClient, "get_agreement", [agreementId]);
      expect(agreementAfterAccept.status).toBe("active");
      state.states.agreementAfterAccept = agreementAfterAccept;

      await send(
        "fund actual GEN agreement escrow",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "fund_agreement",
        [agreementId, 1000],
        evidence,
        1000n,
      );
      const milestones = await readCase(partyAClient, "list_milestones", [agreementId]);
      const milestoneId = lastId(milestones, "list_milestones");
      await send(
        "allocate funded milestone",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "fund_milestone",
        [agreementId, milestoneId],
        evidence,
      );
      await send(
        "register developer deliverable",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "submit_deliverable",
        [agreementId, milestoneId, `github:${commitSha}`],
        evidence,
      );
      const proofArgs = buildRegisterDeliveryProofArgs({
        agreementId,
        milestoneId,
        repositoryUrl,
        repositoryIdentity: "ometere123/caseweave",
        commitSha,
        pullRequest: { status: "not_submitted" },
        changedFiles: EVIDENCE_CHANGED_FILES,
        ciResults: {
          commit_sha: commitSha,
          conclusion: "success",
          workflow: "caseweave-ci",
          url: `https://api.github.com/repos/ometere123/caseweave/commits/${commitSha}/check-runs`,
        },
        deploymentArtifacts: [APP_EVIDENCE_URL],
        evidenceUrl: EVIDENCE_URL,
      });
      const registered = await send(
        "register commit-pinned delivery proof",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "register_delivery_proof",
        proofArgs,
        evidence,
      );
      const proofId =
        extractTransactionReturnString(registered.receipt) ??
        lastId(
          await readCase(partyAClient, "list_delivery_proofs", [agreementId]),
          "list_delivery_proofs",
        );
      const proofBeforeVerification = await readCase(partyAClient, "get_delivery_proof", [proofId]);
      let verifiedProof: Awaited<ReturnType<typeof send>> | null = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          verifiedProof = await send(
            `verify delivery proof with independent validator web retrieval (attempt ${attempt})`,
            partyAClient,
            partyA,
            CONTRACT_ADDRESS,
            "verify_delivery_proof",
            [proofId],
            evidence,
          );
          break;
        } catch (error) {
          if (!isRetryableConsensusFailure(error) || attempt === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (!verifiedProof) throw new Error("delivery proof verification did not produce a finalized result");
      const proofAfterVerification = await readCase(partyAClient, "get_delivery_proof", [proofId]);
      expect(proofAfterVerification.status).toBe("verified");
      expect(proofAfterVerification.content_hash).toMatch(/^[0-9a-f]{64}$/);
      state.proof = { proofId, before: proofBeforeVerification, after: proofAfterVerification };
      state.proofVerificationTransaction = verifiedProof.item;

      const disputeBefore = await readCase(partyBClient, "list_disputes_by_agreement", [agreementId]);
      const filed = await send(
        "file performance dispute as the counterparty",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "file_performance_dispute",
        [
          agreementId,
          proofId,
          `The committed CaseWeave software delivery is the exact GitHub repository ometere123/caseweave at immutable commit ${EVIDENCE_COMMIT}. The claimant requests independent verification that this source revision and its changed-file membership match the agreed technical delivery obligation, with release of the funded milestone only if the verified source facts and acceptance criteria support that result.`,
          "release_payment",
        ],
        evidence,
      );
      const disputeId =
        extractTransactionReturnString(filed.receipt) ??
        lastId(
          await readCase(partyBClient, "list_disputes_by_agreement", [agreementId]),
          "list_disputes_by_agreement",
        );
      state.disputeId = disputeId;
      state.states.disputeBefore = disputeBefore;
      state.states.disputeAfterFile = await readCase(partyBClient, "get_dispute", [disputeId]);

      await send(
        "submit respondent response",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "submit_response",
        [
          disputeId,
          "The developer submits a commit-pinned delivery record and requests independent assessment of the funded milestone.",
          [COUNTER_EVIDENCE_URL],
        ],
        evidence,
      );
      const disputeAfterResponse = await readCase(partyAClient, "get_dispute", [disputeId]);
      expect(disputeAfterResponse.status).toBe("awaiting_precedent_search");
      state.states.disputeAfterResponse = disputeAfterResponse;

      let respondentEvidenceVerification: Awaited<ReturnType<typeof send>> | null = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          respondentEvidenceVerification = await send(
            `verify respondent delivery evidence (attempt ${attempt})`,
            partyAClient,
            partyA,
            CONTRACT_ADDRESS,
            "verify_evidence_url",
            [disputeId, "respondent", 0],
            evidence,
          );
          break;
        } catch (error) {
          if (!isRetryableConsensusFailure(error) || attempt === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (!respondentEvidenceVerification) {
        throw new Error("respondent evidence verification did not produce a finalized result");
      }

      const responseDeadline = futureUtc(6 * 60 * 60);
      const challengeDeadline = futureUtc(12 * 60 * 60);
      await send(
        "propose bilateral response and challenge deadlines",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "set_dispute_deadlines",
        [disputeId, responseDeadline, challengeDeadline],
        evidence,
      );
      await send(
        "accept bilateral response and challenge deadlines",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "set_dispute_deadlines",
        [disputeId, responseDeadline, challengeDeadline],
        evidence,
      );

      const appealDeadline = futureUtc(24 * 60 * 60);
      await send(
        "propose the immutable appeal window before verdict finalization",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "set_appeal_window",
        [disputeId, appealDeadline],
        evidence,
      );
      await send(
        "accept the immutable appeal window",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "set_appeal_window",
        [disputeId, appealDeadline],
        evidence,
      );

      await send(
        "verify claimant evidence snapshot",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "verify_evidence_url",
        [disputeId, "claimant", 0],
        evidence,
      );
      await send(
        "add authoritative GitHub commit metadata as claimant evidence",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "add_evidence",
        [disputeId, "claimant", SOURCE_FACTS_EVIDENCE_URL],
        evidence,
      );
      await send(
        "verify authoritative claimant source facts",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "verify_evidence_url",
        [disputeId, "claimant", 1],
        evidence,
      );
      const challenge = await send(
        "challenge a material evidence claim as claimant",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "challenge_evidence",
        [
          disputeId,
          "respondent",
          0,
          "authenticity",
          "The respondent's delivery record must be independently re-fetched before this assertion is admitted.",
          CHALLENGE_EVIDENCE_URL,
        ],
        evidence,
      );
      const challengeId =
        extractTransactionReturnString(challenge.receipt) ??
        lastId(
          await readCase(partyAClient, "list_evidence_challenges", [disputeId]),
          "list_evidence_challenges",
        );
      let counterEvidenceVerification;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          counterEvidenceVerification = await send(
            `verify immutable counter-evidence for the challenge (attempt ${attempt})`,
            partyBClient,
            partyB,
            CONTRACT_ADDRESS,
            "verify_evidence_url",
            [disputeId, "claimant", 2],
            evidence,
          );
          break;
        } catch (error) {
          if (
            attempt === 3 ||
            !isRetryableConsensusFailure(error)
          ) {
            throw error;
          }
        }
      }
      if (!counterEvidenceVerification) {
        throw new Error("counter-evidence verification did not produce a finalized result");
      }
      let resolvedChallenge;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          resolvedChallenge = await send(
            `resolve challenged evidence by independent evidence-court consensus (attempt ${attempt})`,
            partyAClient,
            partyA,
            CONTRACT_ADDRESS,
            "resolve_evidence_challenge",
            [challengeId],
            evidence,
          );
          break;
        } catch (error) {
          if (
            attempt === 3 ||
            !isRetryableConsensusFailure(error)
          ) {
            throw error;
          }
        }
      }
      if (!resolvedChallenge) {
        throw new Error("evidence challenge resolution did not produce a finalized result");
      }
      state.states.evidenceAfterChallenge = await readCase(
        partyAClient,
        "list_evidence_for_dispute",
        [disputeId],
      );

      let precedentSearch: Awaited<ReturnType<typeof send>> | null = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          precedentSearch = await send(
            `request bounded precedent search (attempt ${attempt})`,
            partyBClient,
            partyB,
            CONTRACT_ADDRESS,
            "request_precedent_search",
            [disputeId],
            evidence,
          );
          break;
        } catch (error) {
          if (!isRetryableConsensusFailure(error) || attempt === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (!precedentSearch) throw new Error("precedent search did not produce a finalized result");
      let verdict: Awaited<ReturnType<typeof send>> | null = null;
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          verdict = await send(
            `request substantive AI-consensus verdict (attempt ${attempt})`,
            partyBClient,
            partyB,
            CONTRACT_ADDRESS,
            "request_verdict",
            [disputeId],
            evidence,
          );
          break;
        } catch (error) {
          if (!isRetryableConsensusFailure(error) || attempt === 5) throw error;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (!verdict) throw new Error("verdict did not produce a finalized result");
      const verdictState = await readCase(partyBClient, "get_dispute", [disputeId]);
      expect(verdictState.status).toBe("verdict_reached");
      state.states.afterVerdict = verdictState;

      const finalized = await send(
        "finalize immutable precedent and judgment",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "finalize_precedent",
        [disputeId],
        evidence,
      );
      const finalizedDispute = await readCase(partyBClient, "get_dispute", [disputeId]);
      const caseId = finalizedDispute.final_case_id || extractTransactionReturnString(finalized.receipt);
      expect(caseId).toMatch(/^CASE_/);
      const precedent = await readCase(partyBClient, "get_precedent_case", [caseId]);
      const originalJudgment = await readCase(partyBClient, "get_current_judgment", [disputeId]);
      expect(finalizedDispute.status).toBe("finalized");
      state.caseId = caseId;
      state.states.afterFinalize = {
        dispute: finalizedDispute,
        precedent,
        judgment: originalJudgment,
      };

      const appeal = await send(
        "file legitimate bonded appeal",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "file_appeal",
        [
          disputeId,
          "new_evidence",
          `The appellant submits the commit-pinned delivery record at ${EVIDENCE_URL} as separately versioned appellate evidence. Validators must independently re-fetch it, compare it with the frozen snapshot and affirm the existing outcome if no material contradiction is found.`,
          1,
        ],
        evidence,
        1n,
      );
      const appealId =
        extractTransactionReturnString(appeal.receipt) ??
        lastId(await readCase(partyAClient, "list_appeals"), "list_appeals");
      const appealDisputeBeforeEvidence = await readCase(partyAClient, "get_dispute", [disputeId]);
      const appealEvidenceIndex = Number(appealDisputeBeforeEvidence.respondent_evidence_count);
      await send(
        "add separately versioned appellate source evidence",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "add_appeal_evidence",
        [appealId, "respondent", EVIDENCE_URL],
        evidence,
      );
      let appealEvidence: any;
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await send(
          `verify separately versioned appellate source evidence (attempt ${attempt})`,
          partyAClient,
          partyA,
          CONTRACT_ADDRESS,
          "verify_evidence_url",
          [disputeId, "respondent", appealEvidenceIndex],
          evidence,
        );
        appealEvidence = await readCase(partyAClient, "get_evidence_item", [
          disputeId,
          "respondent",
          appealEvidenceIndex,
        ]);
        if (appealEvidence.status === "verified") break;
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
      if (appealEvidence?.status !== "verified") {
        throw new Error(
          `appellate evidence did not reach verified status: ${JSON.stringify(appealEvidence)}`,
        );
      }
      state.states.appealEvidence = appealEvidence;
      const appealBeforeUnauthorized = {
        appeal: await readCase(thirdClient, "get_appeal", [appealId]),
        dispute: await readCase(thirdClient, "get_dispute", [disputeId]),
        precedent: await readCase(thirdClient, "get_precedent_case", [caseId]),
      };
      const unauthorized = await send(
        "reject unrelated administrative appeal-resolution attempt",
        thirdClient,
        third,
        CONTRACT_ADDRESS,
        "resolve_appeal",
        [appealId, "overturned_precedent"],
        evidence,
        0n,
        false,
      );
      const afterUnauthorized = {
        appeal: await readCase(thirdClient, "get_appeal", [appealId]),
        dispute: await readCase(thirdClient, "get_dispute", [disputeId]),
        precedent: await readCase(thirdClient, "get_precedent_case", [caseId]),
      };
      expect(afterUnauthorized).toEqual(appealBeforeUnauthorized);
      state.unauthorizedAppealResolution = {
        transaction: unauthorized.item,
        before: appealBeforeUnauthorized,
        after: afterUnauthorized,
      };

      let appellate: Awaited<ReturnType<typeof send>> | null = null;
      // One bounded appellate transaction is intentional: a failed consensus
      // result must be diagnosed, not hidden behind repeated identical writes.
      for (let attempt = 1; attempt <= 1; attempt += 1) {
        try {
          appellate = await send(
            `request independent appellate validator consensus (attempt ${attempt})`,
            ownerClient,
            owner,
            CONTRACT_ADDRESS,
            "request_appeal_review",
            [appealId],
            evidence,
          );
          break;
        } catch (error) {
          throw error;
        }
      }
      if (!appellate) {
        throw new Error("appellate consensus did not produce a finalized result");
      }
      const afterAppeal = {
        appeal: await readCase(ownerClient, "get_appeal", [appealId]),
        dispute: await readCase(ownerClient, "get_dispute", [disputeId]),
        precedent: await readCase(ownerClient, "get_precedent_case", [caseId]),
        judgment: await readCase(ownerClient, "get_current_judgment", [disputeId]),
      };
      expect(afterAppeal.appeal.status).toBe("resolved");
      expect(afterAppeal.dispute.status).toBe("finalized");
      expect(afterAppeal.judgment.status).toBe("finalized");
      state.appealId = appealId;
      state.appellateDecision = appellate.item;
      state.states.afterAppeal = afterAppeal;

      const bondRelease = await send(
        "release the resolved appeal bond into trusted custody",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "release_appeal_bond",
        [appealId],
        evidence,
      );
      const bondTransferId =
        extractTransactionReturnString(bondRelease.receipt) ??
        lastId(await readCase(partyAClient, "list_transfers", [agreementId]), "list_transfers");
      const bondBeforeCustody = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      const bondReceiverChild = await waitForSuccessfulChild(
        partyAClient,
        bondRelease.hash,
        "appeal-bond custody message",
      );
      const bondCallbackChild = await waitForSuccessfulChild(
        partyAClient,
        bondReceiverChild.childHash,
        "appeal-bond custody callback",
      );
      const bondAfterCustody = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      const bondCustody = await readReceiver(partyAClient, "get_custody", [bondTransferId]);
      expect(bondAfterCustody.status).toBe("custodied");
      expect(bondCustody.status).toBe("custodied");

      const bondFakeBefore = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      const bondFake = await send(
        "reject fabricated appeal-bond child hash",
        thirdClient,
        third,
        CONTRACT_ADDRESS,
        "confirm_transfer",
        [bondTransferId, `0x${"1".repeat(64)}`],
        evidence,
        0n,
        false,
      );
      const bondFakeAfter = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      expect(bondFakeAfter).toEqual(bondFakeBefore);

      const bondWithdraw = await send(
        "withdraw appeal bond from tracked custody",
        partyAClient,
        partyA,
        RECEIVER_ADDRESS,
        "withdraw",
        [bondTransferId],
        evidence,
      );
      const bondWithdrawalChild = await waitForSuccessfulChild(
        partyAClient,
        bondWithdraw.hash,
        "appeal-bond beneficiary withdrawal",
      );
      const bondCustodyAfterWithdrawal = await readReceiver(
        partyAClient,
        "get_custody",
        [bondTransferId],
      );
      expect(bondCustodyAfterWithdrawal.status).toBe("withdrawal_submitted");
      const bondWithdrawalLockRelease = await send(
        "reconcile finalized appeal-bond child with trusted receiver",
        ownerClient,
        owner,
        RECEIVER_ADDRESS,
        "release_withdrawal_lock",
        [bondTransferId, bondWithdrawalChild.childHash],
        evidence,
      );
      const bondCustodyAfterReconciliation = await readReceiver(
        ownerClient,
        "get_custody",
        [bondTransferId],
      );
      expect(bondCustodyAfterReconciliation.status).toBe("withdrawal_submitted");
      expect(bondCustodyAfterReconciliation.withdrawal_child_transaction_id).toBe(
        bondWithdrawalChild.childHash,
      );
      state.appealBond = {
        transaction: bondRelease.item,
        transferId: bondTransferId,
        beforeCustody: bondBeforeCustody,
        afterCustody: bondAfterCustody,
        custody: bondCustody,
        custodyChild: {
          hash: bondReceiverChild.childHash,
          explorer: getExplorerTxUrl(bondReceiverChild.childHash),
          consensusStatus: bondReceiverChild.receipt.statusName ?? bondReceiverChild.receipt.status,
          executionResult: leaderReceipt(bondReceiverChild.receipt)?.execution_result ?? "UNKNOWN",
        },
        callbackChild: {
          hash: bondCallbackChild.childHash,
          explorer: getExplorerTxUrl(bondCallbackChild.childHash),
          consensusStatus: bondCallbackChild.receipt.statusName ?? bondCallbackChild.receipt.status,
          executionResult: leaderReceipt(bondCallbackChild.receipt)?.execution_result ?? "UNKNOWN",
        },
        fabricatedConfirmation: {
          transaction: bondFake.item,
          before: bondFakeBefore,
          after: bondFakeAfter,
        },
        withdrawal: {
          transaction: bondWithdraw.item,
          child: {
            hash: bondWithdrawalChild.childHash,
            explorer: getExplorerTxUrl(bondWithdrawalChild.childHash),
            consensusStatus: bondWithdrawalChild.receipt.statusName ?? bondWithdrawalChild.receipt.status,
          },
          custody: bondCustodyAfterWithdrawal,
        },
        reconciliation: {
          transaction: bondWithdrawalLockRelease.item,
          custody: bondCustodyAfterReconciliation,
        },
      };

      const currentJudgment = afterAppeal.judgment;
      const consumed = await send(
        "consume finalized judgment from the second Intelligent Contract",
        ownerClient,
        owner,
        CONSUMER_ADDRESS,
        "consume_judgment",
        [
          toCalldataAddress(CONTRACT_ADDRESS),
          currentJudgment.judgment_id,
          agreementId,
          disputeId,
          Number(currentJudgment.version),
        ],
        evidence,
      );
      const consumedJudgment = await readConsumer(ownerClient, "get_consumed", [
        toCalldataAddress(CONTRACT_ADDRESS),
        currentJudgment.judgment_id,
      ]);
      expect(consumedJudgment.judgment_id).toBe(currentJudgment.judgment_id);
      expect(consumedJudgment.version).toBe(Number(currentJudgment.version));
      state.consumer = { transaction: consumed.item, record: consumedJudgment };

      const settlement = await send(
        "execute deterministic funded settlement",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "settle_judgment",
        [disputeId],
        evidence,
      );
      const transferId =
        extractTransactionReturnString(settlement.receipt) ??
        lastId(await readCase(partyAClient, "list_transfers", [agreementId]), "list_transfers");
      const settlementReceiverChild = await waitForSuccessfulChild(
        partyAClient,
        settlement.hash,
        "judgment settlement custody message",
      );
      const settlementCallbackChild = await waitForSuccessfulChild(
        partyAClient,
        settlementReceiverChild.childHash,
        "judgment settlement custody callback",
      );
      const transferBeforeCustody = await readCase(partyAClient, "get_transfer", [transferId]);
      const transferAfterCustody = await readCase(partyAClient, "get_transfer", [transferId]);
      const receiverCustody = await readReceiver(partyAClient, "get_custody", [transferId]);
      const fakeSettlement = await send(
        "reject fabricated settlement child hash",
        thirdClient,
        third,
        CONTRACT_ADDRESS,
        "confirm_transfer",
        [transferId, `0x${"f".repeat(64)}`],
        evidence,
        0n,
        false,
      );
      const transferAfterFake = await readCase(partyAClient, "get_transfer", [transferId]);
      expect(transferBeforeCustody.status).toBe("custodied");
      expect(transferAfterFake).toEqual(transferBeforeCustody);
      expect(transferAfterCustody.status).toBe("custodied");
      expect(receiverCustody.status).toBe("custodied");

      const recipient = String(transferAfterCustody.recipient).toLowerCase();
      const recipientClient = recipient === partyA.address.toLowerCase() ? partyAClient : partyBClient;
      const recipientAccount = recipient === partyA.address.toLowerCase() ? partyA : partyB;
      const withdrawal = await send(
        "withdraw settlement from tracked custody",
        recipientClient,
        recipientAccount,
        RECEIVER_ADDRESS,
        "withdraw",
        [transferId],
        evidence,
      );
      const withdrawalChild = await waitForSuccessfulChild(
        recipientClient,
        withdrawal.hash,
        "settlement beneficiary withdrawal",
      );
      const transferAfterWithdrawal = await readCase(recipientClient, "get_transfer", [transferId]);
      const receiverAfterWithdrawal = await readReceiver(recipientClient, "get_custody", [transferId]);
      const escrowAfterSettlement = await readCase(recipientClient, "get_escrow", [agreementId]);
      const accounting = await readCase(recipientClient, "get_accounting_invariant");
      expect(transferAfterWithdrawal.status).toBe("custodied");
      expect(receiverAfterWithdrawal.status).toBe("withdrawal_submitted");
      expect(escrowAfterSettlement.pending_transfer).toBe(0);
      expect(accounting.solvent).toBe(true);
      const duplicateSettlement = await send(
        "reject duplicate judgment settlement",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "settle_judgment",
        [disputeId],
        evidence,
        0n,
        false,
      );
      state.settlement = {
        transaction: settlement.item,
        transferId,
        beforeCustody: transferBeforeCustody,
        afterCustody: transferAfterCustody,
        receiverCustody,
        custodyChild: {
          hash: settlementReceiverChild.childHash,
          explorer: getExplorerTxUrl(settlementReceiverChild.childHash),
          consensusStatus: settlementReceiverChild.receipt.statusName ?? settlementReceiverChild.receipt.status,
          executionResult: leaderReceipt(settlementReceiverChild.receipt)?.execution_result ?? "UNKNOWN",
        },
        callbackChild: {
          hash: settlementCallbackChild.childHash,
          explorer: getExplorerTxUrl(settlementCallbackChild.childHash),
          consensusStatus: settlementCallbackChild.receipt.statusName ?? settlementCallbackChild.receipt.status,
          executionResult: leaderReceipt(settlementCallbackChild.receipt)?.execution_result ?? "UNKNOWN",
        },
        fabricatedConfirmation: {
          transaction: fakeSettlement.item,
          before: transferBeforeCustody,
          after: transferAfterFake,
        },
        withdrawal: {
          transaction: withdrawal.item,
          child: {
            hash: withdrawalChild.childHash,
            explorer: getExplorerTxUrl(withdrawalChild.childHash),
            consensusStatus: withdrawalChild.receipt.statusName ?? withdrawalChild.receipt.status,
          },
          transfer: transferAfterWithdrawal,
          custody: receiverAfterWithdrawal,
        },
        duplicateAttempt: duplicateSettlement.item,
        escrowAfterSettlement,
        accounting,
      };
      state.finalState = {
        appeal: afterAppeal,
        judgment: await readCase(ownerClient, "get_current_judgment", [disputeId]),
        precedent: await readCase(ownerClient, "get_precedent_case", [caseId]),
        transfer: transferAfterWithdrawal,
        receiverCustody: receiverAfterWithdrawal,
      };
      writeOutput();
    } catch (error) {
      state.failure = error instanceof Error ? error.message : String(error);
      writeOutput();
      throw error;
    }
  },
  90 * 60 * 1000,
);
