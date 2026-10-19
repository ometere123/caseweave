import { CalldataAddress } from "genlayer-js/types";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x" + "0".repeat(40);

/**
 * Convert a user-entered hexadecimal wallet address into the runtime SDK
 * value that GenLayer's calldata encoder recognizes as an address.
 */
export function toCalldataAddress(input: string): CalldataAddress {
  const address = input.trim();
  if (!ADDRESS_PATTERN.test(address)) {
    throw new Error("Enter a valid 20-byte wallet address.");
  }
  if (address.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Enter a non-zero wallet address.");
  }

  const bytes = Uint8Array.from(
    { length: 20 },
    (_, index) =>
      Number.parseInt(address.slice(2 + index * 2, 4 + index * 2), 16),
  );
  return new CalldataAddress(bytes);
}

export function assertDistinctCounterparty(
  counterparty: string,
  creator: string,
): CalldataAddress {
  const typedAddress = toCalldataAddress(counterparty);
  const creatorAddress = creator.trim();
  if (
    ADDRESS_PATTERN.test(creatorAddress) &&
    creatorAddress.toLowerCase() === counterparty.trim().toLowerCase()
  ) {
    throw new Error("The counterparty must be different from your wallet.");
  }
  return typedAddress;
}
