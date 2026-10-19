import { readFileSync, writeFileSync } from "node:fs";
import { Wallet } from "ethers";
import { expect, it } from "vitest";
import { createAccount, createClient, chains } from "../../app/node_modules/genlayer-js/dist/index.js";
import { TransactionStatus } from "../../app/node_modules/genlayer-js/dist/types/index.js";
import { buildCreateAgreementArgs } from "../../app/lib/contract";
import {
  extractTransactionReturnString,
  getExplorerTxUrl,
  type ReceiptLike,
} from "../../app/lib/genlayer";
import { resolveCreatedAgreementId } from "../../app/lib/create-agreement";

const CONTRACT_ADDRESS =
  process.env.CASEWEAVE_E2E_CONTRACT_ADDRESS ??
  "0x99be950790dEec2F474e5F6E55845eF75D8872a0";
const EVIDENCE_URL =
  "https://raw.githubusercontent.com/ometere123/caseweave/3916d4a/README.md";

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

async function readContract(client: any, functionName: string, args: any[] = []) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
}

function leaderReceipt(receipt: any) {
  return (
    receipt.consensus_data?.leader_receipt?.find(
      (item: any) => item.mode === "leader",
    ) ?? receipt.consensus_data?.leader_receipt?.[0]
  );
}

async function send(
  label: string,
  client: any,
  account: any,
  functionName: string,
  args: any[],
  evidence: any[],
  expectSuccess = true,
) {
  const hash = await client.writeContract({
    account,
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  });
  const waited = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 120,
    interval: 3000,
  });
  const full = await client.getTransaction({ hash });
  const receipt = (full ?? waited) as ReceiptLike;
  const leader = leaderReceipt(receipt);
  const executionResult = leader?.execution_result ?? "UNKNOWN";
  const executionError =
    leader?.error ??
    leader?.genvm_result?.error_description ??
    leader?.genvm_result?.raw_error ??
    null;
  const item = {
    label,
    method: functionName,
    hash,
    explorer: getExplorerTxUrl(hash),
    consensusStatus: receipt.statusName ?? waited.statusName ?? receipt.status,
    resultName: receipt.resultName ?? waited.resultName ?? receipt.result,
    executionResult,
    executionResultName: receipt.txExecutionResultName,
    consensusFinal: receipt.consensus_data?.final ?? null,
    executionError,
    leaderResult: leader?.result ?? null,
  };
  evidence.push(item);

  if (expectSuccess && executionResult !== "SUCCESS") {
    throw new Error(
      `${label} finalized without successful GenVM execution: ${JSON.stringify(item)}`,
    );
  }
  if (!expectSuccess && executionResult === "SUCCESS") {
    throw new Error(`${label} unexpectedly succeeded: ${JSON.stringify(item)}`);
  }

  return { hash, receipt, item };
}

it(
  "completes the corrected CaseWeave workflow on StudioNet",
  async () => {
    const evidence: any[] = [];
    const outputPath = process.env.CASEWEAVE_E2E_OUTPUT;
    const writeOutput = (payload: any) => {
      if (outputPath) {
        writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
      }
    };

    const owner = loadAccount("owner");
    const partyA = loadAccount("party_a");
    const partyB = loadAccount("party_b");
    const third = loadAccount("third");
    const ownerClient = createClient({ chain: chains.studionet, account: owner });
    const partyAClient = createClient({ chain: chains.studionet, account: partyA });
    const partyBClient = createClient({ chain: chains.studionet, account: partyB });
    const thirdClient = createClient({ chain: chains.studionet, account: third });

    const state: any = {
      network: "studionet",
      chainId: 61999,
      rpc: "https://studio.genlayer.com/api",
      contract: CONTRACT_ADDRESS,
      accounts: {
        owner: owner.address,
        partyA: partyA.address,
        partyB: partyB.address,
        third: third.address,
      },
      evidenceUrl: EVIDENCE_URL,
      transactions: evidence,
    };

    try {
      expect((await readContract(ownerClient, "get_owner")) as string).toBe(
        owner.address,
      );

      const title = "CaseWeave reviewer remediation agreement";
      const agreementText =
        "The respondent must deliver the agreed work before the deadline.";
      const expectedAgreement = {
        creator: partyA.address,
        counterparty: partyB.address,
        title,
        agreementText,
        agreementType: "bounty",
        tags: ["reviewer", "remediation"],
        stakeAmount: 0,
        precedentPolicy: "public_precedent",
      };

      const agreementsBefore = await readContract(
        partyAClient,
        "list_agreements",
      );
      const created = await send(
        "create agreement through buildCreateAgreementArgs",
        partyAClient,
        partyA,
        "create_agreement",
        buildCreateAgreementArgs(expectedAgreement),
        evidence,
      );
      const agreementId = await resolveCreatedAgreementId({
        hash: created.hash,
        receipt: created.receipt,
        expected: expectedAgreement,
        readAgreement: async (id) =>
          (await readContract(partyAClient, "get_agreement", [id])) as any,
        listAgreements: async () =>
          (await readContract(partyAClient, "list_agreements")) as any,
      });
      const agreementAfterCreate = await readContract(
        partyAClient,
        "get_agreement",
        [agreementId],
      );
      expect(agreementAfterCreate.creator.toLowerCase()).toBe(
        partyA.address.toLowerCase(),
      );
      expect(agreementAfterCreate.counterparty.toLowerCase()).toBe(
        partyB.address.toLowerCase(),
      );
      state.agreementId = agreementId;
      state.states = { agreementsBefore, agreementAfterCreate };

      const agreementBeforeAccept = agreementAfterCreate;
      await send(
        "accept agreement as counterparty",
        partyBClient,
        partyB,
        "accept_agreement",
        [agreementId],
        evidence,
      );
      const agreementAfterAccept = await readContract(
        partyBClient,
        "get_agreement",
        [agreementId],
      );
      expect(agreementAfterAccept.status).toBe("active");
      state.states.agreementBeforeAccept = agreementBeforeAccept;
      state.states.agreementAfterAccept = agreementAfterAccept;

      const claimSummary =
        "The README-backed delivery obligation was not completed by the respondent.";
      const disputeBefore = await readContract(
        partyAClient,
        "list_disputes_by_agreement",
        [agreementId],
      );
      const filed = await send(
        "file dispute as legitimate claimant",
        partyAClient,
        partyA,
        "file_dispute",
        [agreementId, claimSummary, "require_revision", [EVIDENCE_URL]],
        evidence,
      );
      const disputeId =
        extractTransactionReturnString(filed.receipt) ??
        Object.keys(
          await readContract(partyAClient, "list_disputes_by_agreement", [
            agreementId,
          ]),
        )[0];
      const disputeAfterFile = await readContract(partyAClient, "get_dispute", [
        disputeId,
      ]);
      expect(disputeAfterFile.claimant.toLowerCase()).toBe(
        partyA.address.toLowerCase(),
      );
      expect(disputeAfterFile.respondent.toLowerCase()).toBe(
        partyB.address.toLowerCase(),
      );
      state.disputeId = disputeId;
      state.states.disputeBefore = disputeBefore;
      state.states.disputeAfterFile = disputeAfterFile;

      const disputeBeforeResponse = disputeAfterFile;
      await send(
        "submit respondent response",
        partyBClient,
        partyB,
        "submit_response",
        [disputeId, "The respondent disputes the delivery claim.", []],
        evidence,
      );
      const disputeAfterResponse = await readContract(
        partyBClient,
        "get_dispute",
        [disputeId],
      );
      expect(disputeAfterResponse.status).toBe("awaiting_precedent_search");
      state.states.disputeBeforeResponse = disputeBeforeResponse;
      state.states.disputeAfterResponse = disputeAfterResponse;

      const evidenceBefore = await readContract(
        partyAClient,
        "get_evidence_item",
        [disputeId, "claimant", 0],
      );
      const verified = await send(
        "verify immutable HTTPS evidence through GenLayer nondeterministic web fetch",
        partyAClient,
        partyA,
        "verify_evidence_url",
        [disputeId, "claimant", 0],
        evidence,
      );
      const evidenceAfter = await readContract(
        partyAClient,
        "get_evidence_item",
        [disputeId, "claimant", 0],
      );
      expect(evidenceAfter.status).toBe("verified");
      expect(evidenceAfter.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(evidenceAfter.http_status).toBe(200);
      state.states.evidenceBefore = evidenceBefore;
      state.states.evidenceAfter = evidenceAfter;
      state.evidenceTransaction = verified.item;

      const disputeBeforeSearch = await readContract(
        partyAClient,
        "get_dispute",
        [disputeId],
      );
      await send(
        "request precedent search",
        partyAClient,
        partyA,
        "request_precedent_search",
        [disputeId],
        evidence,
      );
      const disputeAfterSearch = await readContract(
        partyAClient,
        "get_dispute",
        [disputeId],
      );
      expect(disputeAfterSearch.status).toBe("awaiting_verdict");
      state.states.disputeBeforeSearch = disputeBeforeSearch;
      state.states.disputeAfterSearch = disputeAfterSearch;

      const disputeBeforeVerdict = disputeAfterSearch;
      await send(
        "request AI-consensus verdict",
        partyAClient,
        partyA,
        "request_verdict",
        [disputeId],
        evidence,
      );
      const disputeAfterVerdict = await readContract(
        partyAClient,
        "get_dispute",
        [disputeId],
      );
      expect(disputeAfterVerdict.status).toBe("verdict_reached");
      expect(disputeAfterVerdict.verdict).toBeTruthy();
      state.states.disputeBeforeVerdict = disputeBeforeVerdict;
      state.states.disputeAfterVerdict = disputeAfterVerdict;

      const disputeBeforeFinalize = disputeAfterVerdict;
      const finalized = await send(
        "finalize precedent",
        partyAClient,
        partyA,
        "finalize_precedent",
        [disputeId],
        evidence,
      );
      const caseId =
        extractTransactionReturnString(finalized.receipt) ??
        (await readContract(partyAClient, "get_dispute", [disputeId])).final_case_id;
      const disputeAfterFinalize = await readContract(
        partyAClient,
        "get_dispute",
        [disputeId],
      );
      const precedentAfterFinalize = await readContract(
        partyAClient,
        "get_precedent_case",
        [caseId],
      );
      expect(caseId).toMatch(/^CASE_/);
      expect(disputeAfterFinalize.status).toBe("finalized");
      expect(precedentAfterFinalize.dispute_id).toBe(disputeId);
      state.caseId = caseId;
      state.states.disputeBeforeFinalize = disputeBeforeFinalize;
      state.states.disputeAfterFinalize = disputeAfterFinalize;
      state.states.precedentAfterFinalize = precedentAfterFinalize;

      const appealBefore = await readContract(partyAClient, "get_dispute", [
        disputeId,
      ]);
      const filedAppeal = await send(
        "file legitimate appeal as appellant",
        partyAClient,
        partyA,
        "file_appeal",
        [
          disputeId,
          "precedent_misapplied",
          "Reconsider the application of the holding.",
          1,
        ],
        evidence,
      );
      const appealId =
        extractTransactionReturnString(filedAppeal.receipt) ??
        Object.keys(await readContract(partyAClient, "list_appeals"))[0];
      const appealAfterFile = await readContract(partyAClient, "get_appeal", [
        appealId,
      ]);
      const disputeAfterAppealFile = await readContract(
        partyAClient,
        "get_dispute",
        [disputeId],
      );
      expect(appealAfterFile.status).toBe("under_review");
      expect(disputeAfterAppealFile.status).toBe("under_appeal");
      state.appealId = appealId;
      state.states.appealBefore = appealBefore;
      state.states.appealAfterFile = appealAfterFile;
      state.states.disputeAfterAppealFile = disputeAfterAppealFile;

      const unauthorizedBefore = {
        appeal: await readContract(thirdClient, "get_appeal", [appealId]),
        dispute: await readContract(thirdClient, "get_dispute", [disputeId]),
        precedent: await readContract(thirdClient, "get_precedent_case", [caseId]),
      };
      const unauthorized = await send(
        "reject unrelated third-wallet appeal resolution",
        thirdClient,
        third,
        "resolve_appeal",
        [appealId, "overturned_precedent"],
        evidence,
        false,
      );
      const unauthorizedAfter = {
        appeal: await readContract(thirdClient, "get_appeal", [appealId]),
        dispute: await readContract(thirdClient, "get_dispute", [disputeId]),
        precedent: await readContract(thirdClient, "get_precedent_case", [caseId]),
      };
      expect(unauthorizedAfter).toEqual(unauthorizedBefore);
      state.unauthorizedResolution = {
        transaction: unauthorized.item,
        before: unauthorizedBefore,
        after: unauthorizedAfter,
      };

      const authorizedBefore = unauthorizedAfter;
      const resolved = await send(
        "resolve appeal as owner",
        ownerClient,
        owner,
        "resolve_appeal",
        [appealId, "overturned_precedent"],
        evidence,
      );
      const finalState = {
        appeal: await readContract(ownerClient, "get_appeal", [appealId]),
        dispute: await readContract(ownerClient, "get_dispute", [disputeId]),
        precedent: await readContract(ownerClient, "get_precedent_case", [caseId]),
      };
      expect(finalState.appeal.status).toBe("resolved");
      expect(finalState.appeal.result).toBe("overturned_precedent");
      expect(finalState.dispute.status).toBe("finalized");
      expect(finalState.precedent.status).toBe("overturned");
      state.authorizedResolution = {
        transaction: resolved.item,
        before: authorizedBefore,
        after: finalState,
      };
      state.finalState = finalState;
      writeOutput(state);
    } catch (error) {
      state.failure = error instanceof Error ? error.message : String(error);
      writeOutput(state);
      throw error;
    }
  },
  45 * 60 * 1000,
);
