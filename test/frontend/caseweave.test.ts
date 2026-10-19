import { describe, expect, it, vi } from "vitest";
import { abi as appSdkAbi } from "../../app/node_modules/genlayer-js/dist/index.js";
import { CalldataAddress } from "../../app/node_modules/genlayer-js/dist/types/index.js";
import { toCalldataAddress, assertDistinctCounterparty } from "../../app/lib/address";
import {
  buildCreateAgreementArgs,
  buildCreateTechnicalAgreementArgs,
  buildFundAgreementArgs,
} from "../../app/lib/contract";
import {
  assertExecutionSucceeded,
  extractTransactionReturnString,
  GenLayerExecutionError,
  getExecutionError,
  getExplorerTxUrl,
} from "../../app/lib/genlayer";
import { resolveCreatedAgreementId } from "../../app/lib/create-agreement";

const CREATOR = "0x1111111111111111111111111111111111111111";
const COUNTERPARTY = "0xAbCdEf0123456789aBcDeF0123456789aBcDeF01";

function successfulReceipt() {
  return {
    txExecutionResult: 1,
    txExecutionResultName: "FINISHED_WITH_RETURN",
    consensus_data: {
      leader_receipt: [
        {
          execution_result: "SUCCESS",
          result: {
            status: "return",
            payload: { readable: '"AGR_7"' },
          },
        },
      ],
    },
  } as never;
}

describe("GenLayer address calldata", () => {
  it("creates a real CalldataAddress with exactly the supplied 20 bytes", () => {
    const typed = toCalldataAddress(`  ${COUNTERPARTY}  `);

    expect(typed).toBeInstanceOf(CalldataAddress);
    expect(Array.from(typed.bytes)).toEqual([
      0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd,
      0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01,
    ]);
  });

  it("uses the SDK address tag instead of the string tag", () => {
    const typed = toCalldataAddress(COUNTERPARTY);
    const typedEncoded = appSdkAbi.calldata.encode(typed);
    const stringEncoded = appSdkAbi.calldata.encode(COUNTERPARTY);

    // genlayer-js 1.1.8 encodes SPECIAL_ADDR as 3 << 3 (0x18).
    expect(typedEncoded[0]).toBe(0x18);
    expect(stringEncoded[0]).not.toBe(0x18);
  });

  it.each([
    "",
    "0x",
    "0x1234",
    `0x${"1".repeat(39)}`,
    `0x${"1".repeat(41)}`,
    `0x${"g".repeat(40)}`,
    `1${"1".repeat(40)}`,
  ])("rejects malformed address %j", (input) => {
    expect(() => toCalldataAddress(input)).toThrow(
      "Enter a valid 20-byte wallet address.",
    );
  });

  it("rejects zero and self-referential counterparties", () => {
    expect(() => toCalldataAddress(`0x${"0".repeat(40)}`)).toThrow(
      "Enter a non-zero wallet address.",
    );
    expect(() => assertDistinctCounterparty(CREATOR, CREATOR)).toThrow(
      "The counterparty must be different from your wallet.",
    );
  });

  it("uses the typed address in the actual create_agreement argument builder", () => {
    const args = buildCreateAgreementArgs({
      creator: CREATOR,
      title: "Typed agreement",
      agreementText: "The work must be delivered.",
      counterparty: COUNTERPARTY,
      agreementType: "bounty",
      tags: ["typed"],
      stakeAmount: 0,
      precedentPolicy: "public_precedent",
    });

    expect(args[2]).toBeInstanceOf(CalldataAddress);
  });

  it("uses the typed address in the structured technical agreement path", () => {
    const args = buildCreateTechnicalAgreementArgs({
      creator: CREATOR,
      title: "Technical agreement",
      agreementText: "The repository change must be delivered.",
      counterparty: COUNTERPARTY,
      agreementType: "agent_service",
      tags: ["github"],
      stakeAmount: 100,
      precedentPolicy: "public_precedent",
      acceptanceCriteria: "The immutable commit contains the deliverable.",
      obligations: [{ id: "delivery", text: "Deliver the commit." }],
      deliverables: [{ id: "source", description: "Reviewable source revision." }],
      milestones: [{
        name: "Delivery",
        obligation_id: "delivery",
        acceptance_criteria: "The commit is present.",
        deadline: "2030-01-01T00:00:00Z",
        amount: 100,
      }],
      repositoryUrl: "https://github.com/ometere123/caseweave",
      sourcePolicy: "github_commit_pinned",
      completionConditions: "Validators authenticate the pinned source.",
    });

    expect(args[2]).toBeInstanceOf(CalldataAddress);
    expect(JSON.parse(args[8] as string)[0].id).toBe("delivery");
    expect(JSON.parse(args[10] as string)[0].amount).toBe(100);
  });

  it("builds payable funding arguments without changing the typed address path", () => {
    expect(buildFundAgreementArgs("AGR_1", 1000)).toEqual(["AGR_1", 1000]);
  });
});

describe("verified GenLayer write results", () => {
  it("extracts a real agreement ID from the finalized leader receipt", () => {
    const receipt = successfulReceipt();
    expect(getExecutionError(receipt)).toBeNull();
    expect(extractTransactionReturnString(receipt)).toBe("AGR_7");
  });

  it("surfaces a finalized transaction whose GenVM execution failed", () => {
    const hash = "0xfailed";
    const receipt = {
      txExecutionResult: 2,
      txExecutionResultName: "FINISHED_WITH_ERROR",
      consensus_data: {
        leader_receipt: [
          {
            execution_result: "FAILURE",
            error: "only the counterparty may accept",
          },
        ],
      },
    } as never;

    expect(getExecutionError(receipt)).toContain("only the counterparty");
    expect(() => assertExecutionSucceeded(hash, receipt)).toThrow(
      "GenVM execution failed",
    );
    try {
      assertExecutionSucceeded(hash, receipt);
    } catch (error) {
      expect(error).toBeInstanceOf(GenLayerExecutionError);
      expect((error as GenLayerExecutionError).hash).toBe(hash);
      expect((error as Error).message).toContain(getExplorerTxUrl(hash));
    }
  });
});

describe("authoritative agreement ID resolution", () => {
  const agreement = {
    agreement_id: "AGR_7",
    creator: CREATOR,
    counterparty: COUNTERPARTY,
    title: "Typed agreement",
    agreement_text: "The work must be delivered.",
    agreement_type: "bounty",
    status: "pending_acceptance",
    stake_amount: 0,
    precedent_policy: "public_precedent",
    tags: ["typed"],
    created_at: "now",
    updated_at: "now",
  };

  const expected = {
    creator: CREATOR,
    counterparty: COUNTERPARTY,
    title: "Typed agreement",
    agreementText: "The work must be delivered.",
    agreementType: "bounty",
    tags: ["typed"],
    stakeAmount: 0,
    precedentPolicy: "public_precedent",
  };

  it("accepts the ID only after an authoritative agreement read matches", async () => {
    const readAgreement = vi.fn(async () => agreement);
    const listAgreements = vi.fn(async () => ({}));

    await expect(
      resolveCreatedAgreementId({
        hash: "0xcreated",
        receipt: successfulReceipt(),
        expected,
        readAgreement,
        listAgreements,
      }),
    ).resolves.toBe("AGR_7");
    expect(readAgreement).toHaveBeenCalledWith("AGR_7");
    expect(listAgreements).not.toHaveBeenCalled();
  });

  it("falls back to one exact list match when the receipt return is absent", async () => {
    await expect(
      resolveCreatedAgreementId({
        hash: "0xcreated",
        receipt: { consensus_data: {} } as never,
        expected,
        readAgreement: vi.fn(),
        listAgreements: vi.fn(async () => ({ AGR_7: agreement })),
      }),
    ).resolves.toBe("AGR_7");
  });

  it("rejects ambiguous or mismatched state so the caller cannot navigate as success", async () => {
    await expect(
      resolveCreatedAgreementId({
        hash: "0xcreated",
        receipt: successfulReceipt(),
        expected,
        readAgreement: vi.fn(async () => ({ ...agreement, title: "wrong" })),
        listAgreements: vi.fn(async () => ({
          AGR_1: { ...agreement, agreement_id: "AGR_1" },
          AGR_2: { ...agreement, agreement_id: "AGR_2" },
        })),
      }),
    ).rejects.toThrow("could not be verified from on-chain state");
  });
});
