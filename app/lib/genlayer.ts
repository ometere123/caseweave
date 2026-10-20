import { createClient, chains } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import type {
  Address,
  CalldataEncodable,
  GenLayerTransaction,
  Hash,
} from "genlayer-js/types";
import {
  CASEWEAVE_CONTRACT_ADDRESS,
  CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS,
  CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS,
} from "./contract";

const STUDIO_EXPLORER_URL = "https://explorer-studio.genlayer.com";

type LeaderReceiptLike = {
  execution_result?: string;
  error?: string | null;
  result?: unknown;
};

export type ReceiptLike = GenLayerTransaction & {
  consensus_data?: {
    leader_receipt?: LeaderReceiptLike[];
  };
};

export class GenLayerExecutionError extends Error {
  constructor(
    public readonly hash: string,
    public readonly receipt: ReceiptLike,
    reason: string,
  ) {
    const isConsensusFailure = reason.startsWith("consensus result");
    super(
      `Transaction ${hash} was finalized but ${isConsensusFailure ? "the consensus result was unsuccessful" : "GenVM execution failed"}: ${reason}. ` +
        `Inspect ${getExplorerTxUrl(hash)}`,
    );
    this.name = "GenLayerExecutionError";
  }
}

export function getExplorerTxUrl(hash: string): string {
  return `${STUDIO_EXPLORER_URL}/tx/${hash}`;
}

/** Return the SDK 1.1.8 execution error, or null for a successful result. */
export function getExecutionError(receipt: ReceiptLike): string | null {
  const hasConsensusData = receipt.consensus_data != null;
  const rawResultName = (receipt as ReceiptLike & { result_name?: string }).result_name;
  const resultName = receipt.resultName ?? rawResultName;
  const result = receipt.result;
  if (hasConsensusData) {
    if (resultName && resultName !== "MAJORITY_AGREE") {
      return `consensus result ${resultName}`;
    }
    if (typeof result === "number" && result !== 6) {
      return `consensus result ${result}`;
    }
  }

  const leaderReceipt =
    receipt.consensus_data?.leader_receipt?.find(
      (item) => (item as LeaderReceiptLike & { mode?: string }).mode === "leader",
    ) ?? receipt.consensus_data?.leader_receipt?.[0];
  const executionResultName = receipt.txExecutionResultName;

  if (executionResultName === "FINISHED_WITH_ERROR" || receipt.txExecutionResult === 2) {
    return leaderReceipt?.error || executionResultName || "FINISHED_WITH_ERROR";
  }

  if (leaderReceipt?.execution_result) {
    if (leaderReceipt.execution_result !== "SUCCESS") {
      return leaderReceipt.error || leaderReceipt.execution_result;
    }
    return null;
  }

  if (executionResultName === "FINISHED_WITH_RETURN" || receipt.txExecutionResult === 1) {
    return null;
  }

  // GenLayer-triggered native value transfers are finalized ordinary
  // transactions. They have no GenVM execution result and their numeric
  // result code is not a validator-consensus result. Require the RPC's
  // explicit value-credit flag before treating one as successful.
  if (!hasConsensusData && receipt.statusName === "FINALIZED") {
    const valueCredited = (receipt as ReceiptLike & { value_credited?: boolean })
      .value_credited;
    return valueCredited === false
      ? "native value transfer was finalized without credited value"
      : null;
  }

  return "the receipt did not include a conclusive GenVM execution result";
}

export function assertExecutionSucceeded(
  hash: string,
  receipt: ReceiptLike,
): void {
  const executionError = getExecutionError(receipt);
  if (executionError) {
    throw new GenLayerExecutionError(hash, receipt, executionError);
  }
}

function mergeReceipts(
  waitedReceipt: GenLayerTransaction,
  fullReceipt: GenLayerTransaction,
): ReceiptLike {
  const waitedConsensus = waitedReceipt.consensus_data;
  const fullConsensus = fullReceipt.consensus_data;
  const leaderReceipt =
    fullConsensus?.leader_receipt ?? waitedConsensus?.leader_receipt;

  return {
    ...waitedReceipt,
    ...fullReceipt,
    ...(leaderReceipt || fullConsensus || waitedConsensus
      ? {
          consensus_data: {
            ...waitedConsensus,
            ...fullConsensus,
            ...(leaderReceipt ? { leader_receipt: leaderReceipt } : {}),
          },
        }
      : {}),
  } as ReceiptLike;
}

async function getTransactionWithRetry(
  client: ReturnType<typeof getReadClient>,
  hash: Hash,
  attempts = 12,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await client.getTransaction({ hash });
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
    : new Error("Unable to retrieve the finalized transaction metadata.");
}

async function waitForFinalizedReceipt(
  client: ReturnType<typeof getReadClient>,
  hash: Hash,
  attempts = 4,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
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
    `Transaction ${hash} could not be read to finality after retries. ` +
      `Inspect ${getExplorerTxUrl(hash)}. ` +
      `${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

function parseReceiptResult(result: unknown): unknown {
  if (typeof result !== "string") return result;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/** Read a string return value from the SDK's verified leader receipt. */
export function extractTransactionReturnString(
  receipt: ReceiptLike,
): string | null {
  const result = parseReceiptResult(
    receipt.consensus_data?.leader_receipt?.[0]?.result,
  );
  if (!result || typeof result !== "object") return null;

  const payload = (result as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") return null;

  const readable = (payload as { readable?: unknown }).readable;
  if (typeof readable !== "string") return null;

  try {
    const decoded = JSON.parse(readable);
    return typeof decoded === "string" ? decoded : null;
  } catch {
    return readable.trim() || null;
  }
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (accounts: string[]) => void) => void;
  removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function getInjectedProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No injected wallet found. Install MetaMask, Rabby, or another browser wallet."
    );
  }
  return window.ethereum;
}

export function getReadClient() {
  return createClient({ chain: chains.studionet });
}

export function getWriteClient(account: Address) {
  return createClient({
    chain: chains.studionet,
    account,
    provider: getInjectedProvider(),
  });
}

export async function connectInjectedWallet(): Promise<Address> {
  const provider = getInjectedProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet did not return an account.");
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${chains.studionet.id.toString(16)}`,
          chainName: chains.studionet.name,
          rpcUrls: chains.studionet.rpcUrls.default.http,
          nativeCurrency: chains.studionet.nativeCurrency,
          blockExplorerUrls: chains.studionet.blockExplorers
            ? [chains.studionet.blockExplorers.default.url]
            : undefined,
        },
      ],
    });
  } catch {
    // Wallet may already have the chain, or user rejected - non-fatal for read/demo purposes.
  }

  return accounts[0] as Address;
}

export async function getAuthorizedAccount(): Promise<Address | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
    })) as string[];
    return accounts && accounts.length > 0 ? (accounts[0] as Address) : null;
  } catch {
    return null;
  }
}

export function onAccountsChanged(handler: (accounts: string[]) => void) {
  if (typeof window === "undefined" || !window.ethereum?.on) return () => {};
  window.ethereum.on("accountsChanged", handler);
  return () => window.ethereum?.removeListener?.("accountsChanged", handler);
}

export async function readContract(
  functionName: string,
  args: CalldataEncodable[] = []
) {
  return readContractAt(CASEWEAVE_CONTRACT_ADDRESS, functionName, args);
}

export async function readContractAt(
  address: Address,
  functionName: string,
  args: CalldataEncodable[] = [],
) {
  const client = getReadClient();
  return client.readContract({
    address,
    functionName,
    args,
  });
}

export async function writeContract(
  account: Address,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = BigInt(0),
) {
  return writeContractAt(
    CASEWEAVE_CONTRACT_ADDRESS,
    account,
    functionName,
    args,
    value,
  );
}

export async function writeContractAt(
  address: Address,
  account: Address,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = BigInt(0),
) {
  const client = getWriteClient(account);
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
  });
  const waitedReceipt = await waitForFinalizedReceipt(client, hash as Hash);
  const fullReceipt = await getTransactionWithRetry(client, hash as Hash);
  const receipt = mergeReceipts(waitedReceipt, fullReceipt);
  assertExecutionSucceeded(hash, receipt);
  return { hash, receipt };
}

function configuredAddress(value: string | "", label: string): Address {
  if (!value) throw new Error(`${label} is not configured for this deployment.`);
  return value as Address;
}

export function readReceiverContract(
  functionName: string,
  args: CalldataEncodable[] = [],
) {
  return readContractAt(
    configuredAddress(CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS, "Settlement receiver"),
    functionName,
    args,
  );
}

export function writeReceiverContract(
  account: Address,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = BigInt(0),
) {
  return writeContractAt(
    configuredAddress(CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS, "Settlement receiver"),
    account,
    functionName,
    args,
    value,
  );
}

export function readJudgmentConsumer(
  functionName: string,
  args: CalldataEncodable[] = [],
) {
  return readContractAt(
    configuredAddress(CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS, "Judgment consumer"),
    functionName,
    args,
  );
}

export function writeJudgmentConsumer(
  account: Address,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = BigInt(0),
) {
  return writeContractAt(
    configuredAddress(CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS, "Judgment consumer"),
    account,
    functionName,
    args,
    value,
  );
}

/** Child transactions are created only after a finalized parent message. */
export async function getTriggeredTransactionIds(hash: string): Promise<string[]> {
  const client = getReadClient();
  return (await client.getTriggeredTransactionIds({ hash: hash as Hash })) as string[];
}
