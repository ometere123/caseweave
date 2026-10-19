import type { ReceiptLike } from "./genlayer";
import type { Agreement } from "./contract";
import { extractTransactionReturnString } from "./genlayer";

export type CreatedAgreementExpectation = {
  creator: string;
  counterparty: string;
  title: string;
  agreementText: string;
  agreementType: string;
  tags: string[];
  stakeAmount: number;
  precedentPolicy: string;
};

function isExpectedAgreement(
  agreement: Agreement,
  expected: CreatedAgreementExpectation,
): boolean {
  return (
    agreement.creator.toLowerCase() === expected.creator.toLowerCase() &&
    agreement.counterparty.toLowerCase() === expected.counterparty.toLowerCase() &&
    agreement.title === expected.title &&
    agreement.agreement_text === expected.agreementText &&
    agreement.agreement_type === expected.agreementType &&
    Number(agreement.stake_amount) === expected.stakeAmount &&
    agreement.precedent_policy === expected.precedentPolicy &&
    JSON.stringify(agreement.tags) === JSON.stringify(expected.tags)
  );
}

/**
 * Resolve an agreement ID only from a verified receipt return or an exact
 * authoritative on-chain match. Callers should navigate only after this
 * function resolves; a mismatch is an error, not a best-effort success.
 */
export async function resolveCreatedAgreementId(input: {
  hash: string;
  receipt: ReceiptLike;
  expected: CreatedAgreementExpectation;
  readAgreement: (agreementId: string) => Promise<Agreement>;
  listAgreements: () => Promise<Record<string, Agreement>>;
}): Promise<string> {
  const receiptAgreementId = extractTransactionReturnString(input.receipt);
  if (receiptAgreementId) {
    try {
      const agreement = await input.readAgreement(receiptAgreementId);
      if (isExpectedAgreement(agreement, input.expected)) {
        return receiptAgreementId;
      }
    } catch {
      // Fall through to the authoritative list read below.
    }
  }

  const agreements = await input.listAgreements();
  const matches = Object.values(agreements).filter((agreement) =>
    isExpectedAgreement(agreement, input.expected),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Transaction ${input.hash} succeeded, but the created agreement could not be verified from on-chain state.`,
    );
  }
  return matches[0].agreement_id;
}
