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
  "0x8a248BA03c31a6EE084a92B21cc4f323F8d04bE7";
const CONSUMER_ADDRESS = process.env.CASEWEAVE_E2E_CONSUMER_ADDRESS;
const EVIDENCE_COMMIT =
  process.env.CASEWEAVE_E2E_COMMIT_SHA ??
  "bdb60f27f4af765c670881fb58afeb7873d071e8";
const EVIDENCE_URL =
  process.env.CASEWEAVE_E2E_EVIDENCE_URL ??
  `https://raw.githubusercontent.com/ometere123/caseweave/${EVIDENCE_COMMIT}/README.md`;

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
      return await client.getTransaction({ hash: hash as any });
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
      return await client.waitForTransactionReceipt({
        hash: hash as any,
        status: TransactionStatus.FINALIZED,
        retries: 180,
        interval: 3000,
      });
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
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
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
  return client.readContract({
    address: CONSUMER_ADDRESS,
    functionName,
    args,
  });
}

async function triggered(client: any, hash: string): Promise<string[]> {
  return (await client
    .getTriggeredTransactionIds({ hash })
    .catch(() => [])) as string[];
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

  return { hash, receipt, item, childTransactionIds };
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
        pullRequest: { number: 1, head_sha: commitSha, merged: true },
        changedFiles: ["contracts/caseweave.py", "app/lib/contract.ts"],
        ciResults: {
          commit_sha: commitSha,
          conclusion: "success",
          workflow: "caseweave-ci",
        },
        deploymentArtifacts: ["https://caseweave.vercel.app"],
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
      const verifiedProof = await send(
        "verify delivery proof with independent validator web retrieval",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "verify_delivery_proof",
        [proofId],
        evidence,
      );
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
          "The developer did not satisfy the committed delivery obligation with independently verifiable evidence.",
          "require_revision",
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
          "The developer relies on the committed source and requests independent assessment.",
          [],
        ],
        evidence,
      );
      const disputeAfterResponse = await readCase(partyAClient, "get_dispute", [disputeId]);
      expect(disputeAfterResponse.status).toBe("awaiting_precedent_search");
      state.states.disputeAfterResponse = disputeAfterResponse;

      await send(
        "verify claimant evidence snapshot",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "verify_evidence_url",
        [disputeId, "claimant", 0],
        evidence,
      );
      const challenge = await send(
        "challenge a material evidence claim as respondent",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "challenge_evidence",
        [
          disputeId,
          "claimant",
          0,
          "incomplete",
          "The fetched artifact does not by itself prove every contractual obligation or the absence of an unrelated completion condition.",
          EVIDENCE_URL,
        ],
        evidence,
      );
      const challengeId =
        extractTransactionReturnString(challenge.receipt) ??
        lastId(
          await readCase(partyAClient, "list_evidence_challenges", [disputeId]),
          "list_evidence_challenges",
        );
      await send(
        "resolve challenged evidence by independent evidence-court consensus",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "resolve_evidence_challenge",
        [challengeId],
        evidence,
      );
      await send(
        "verify respondent counter-evidence snapshot",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "verify_evidence_url",
        [disputeId, "respondent", 0],
        evidence,
      );
      state.states.evidenceAfterChallenge = await readCase(
        partyAClient,
        "list_evidence_for_dispute",
        [disputeId],
      );

      await send(
        "request bounded precedent search",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "request_precedent_search",
        [disputeId],
        evidence,
      );
      await send(
        "request substantive AI-consensus verdict",
        partyBClient,
        partyB,
        CONTRACT_ADDRESS,
        "request_verdict",
        [disputeId],
        evidence,
      );
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
          "precedent_misapplied",
          "The first-instance holding should be independently reconsidered against the frozen evidence.",
          1,
        ],
        evidence,
        1n,
      );
      const appealId =
        extractTransactionReturnString(appeal.receipt) ??
        lastId(await readCase(partyAClient, "list_appeals"), "list_appeals");
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

      const appellate = await send(
        "request independent appellate validator consensus",
        ownerClient,
        owner,
        CONTRACT_ADDRESS,
        "request_appeal_review",
        [appealId],
        evidence,
      );
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
        "release the resolved appeal bond through a tracked child transfer",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "release_appeal_bond",
        [appealId],
        evidence,
      );
      const bondChildIds = bondRelease.childTransactionIds.length
        ? bondRelease.childTransactionIds
        : await waitForTriggered(partyAClient, bondRelease.hash);
      if (bondChildIds.length === 0) {
        throw new Error("appeal-bond release finalized without a tracked child transfer transaction");
      }
      const bondChildHash = bondChildIds[0];
      const bondChildReceipt = await waitForFinalizedReceipt(partyAClient, bondChildHash);
      const bondChildFull = await getTransactionWithRetry(partyAClient, bondChildHash).catch(() => null);
      const bondChild = mergedReceipt(bondChildReceipt, bondChildFull);
      const bondChildError = getExecutionError(bondChild);
      if (bondChildError) throw new Error(`child appeal-bond transfer failed: ${bondChildError}`);
      const bondTransferId =
        extractTransactionReturnString(bondRelease.receipt) ??
        lastId(await readCase(partyAClient, "list_transfers", [agreementId]), "list_transfers");
      const bondBeforeConfirmation = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      const bondConfirmed = await send(
        "confirm appeal-bond delivery after child finality",
        partyAClient,
        partyA,
        CONTRACT_ADDRESS,
        "confirm_transfer",
        [bondTransferId, bondChildHash],
        evidence,
      );
      const bondAfterConfirmation = await readCase(partyAClient, "get_transfer", [bondTransferId]);
      expect(bondAfterConfirmation.status).toBe("delivered");
      state.appealBond = {
        transaction: bondRelease.item,
        childTransaction: {
          hash: bondChildHash,
          explorer: getExplorerTxUrl(bondChildHash),
          consensusStatus: bondChild.statusName ?? bondChild.status,
          executionResult: leaderReceipt(bondChild)?.execution_result ?? "UNKNOWN",
        },
        confirmation: bondConfirmed.item,
        before: bondBeforeConfirmation,
        after: bondAfterConfirmation,
      };

      if (!CONSUMER_ADDRESS) {
        throw new Error("CASEWEAVE_E2E_CONSUMER_ADDRESS is required for the cross-contract proof");
      }
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
      const consumedJudgment = await readConsumer(ownerClient, "get_consumed", [currentJudgment.judgment_id]);
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
      const childIds = settlement.childTransactionIds.length
        ? settlement.childTransactionIds
        : await waitForTriggered(partyAClient, settlement.hash);
      if (childIds.length === 0) {
        throw new Error("settlement finalized without a tracked child transfer transaction");
      }
      const childHash = childIds[0];
      const childReceipt = await waitForFinalizedReceipt(partyAClient, childHash);
      const childFull = await getTransactionWithRetry(partyAClient, childHash).catch(() => null);
      const child = mergedReceipt(childReceipt, childFull);
      const childError = getExecutionError(child);
      if (childError) throw new Error(`child settlement transfer failed: ${childError}`);
      const transferId =
        extractTransactionReturnString(settlement.receipt) ??
        lastId(await readCase(partyAClient, "list_transfers", [agreementId]), "list_transfers");
      const transferBeforeConfirmation = await readCase(partyAClient, "get_transfer", [transferId]);
      const recipient = String(transferBeforeConfirmation.recipient).toLowerCase();
      const recipientClient = recipient === partyA.address.toLowerCase() ? partyAClient : partyBClient;
      const recipientAccount = recipient === partyA.address.toLowerCase() ? partyA : partyB;
      const confirmed = await send(
        "confirm settlement only after child transfer finality",
        recipientClient,
        recipientAccount,
        CONTRACT_ADDRESS,
        "confirm_transfer",
        [transferId, childHash],
        evidence,
      );
      const transferAfterConfirmation = await readCase(recipientClient, "get_transfer", [transferId]);
      const escrowAfterSettlement = await readCase(recipientClient, "get_escrow", [agreementId]);
      const accounting = await readCase(recipientClient, "get_accounting_invariant");
      expect(transferAfterConfirmation.status).toBe("delivered");
      expect(escrowAfterSettlement.pending_transfer).toBe(0);
      expect(accounting.solvent).toBe(true);
      state.settlement = {
        transaction: settlement.item,
        childTransaction: {
          hash: childHash,
          explorer: getExplorerTxUrl(childHash),
          consensusStatus: child.statusName ?? child.status,
          executionResult: leaderReceipt(child)?.execution_result ?? "UNKNOWN",
        },
        confirmation: confirmed.item,
        transferBeforeConfirmation,
        transferAfterConfirmation,
        escrowAfterSettlement,
        accounting,
      };
      state.finalState = afterAppeal;
      writeOutput();
    } catch (error) {
      state.failure = error instanceof Error ? error.message : String(error);
      writeOutput();
      throw error;
    }
  },
  90 * 60 * 1000,
);
