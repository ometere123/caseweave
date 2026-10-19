import { createClient, chains } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import type {
  Address,
  CalldataEncodable,
  GenLayerTransaction,
} from "genlayer-js/types";
import { CASEWEAVE_CONTRACT_ADDRESS } from "./contract";

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
    super(
      `Transaction ${hash} was finalized but GenVM execution failed: ${reason}. ` +
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
  const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
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
  const client = getReadClient();
  return client.readContract({
    address: CASEWEAVE_CONTRACT_ADDRESS,
    functionName,
    args,
  });
}

export async function writeContract(
  account: Address,
  functionName: string,
  args: CalldataEncodable[] = []
) {
  const client = getWriteClient(account);
  const hash = await client.writeContract({
    address: CASEWEAVE_CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  });
  const waitedReceipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 120,
    interval: 3000,
  });
  const fullReceipt = await client.getTransaction({ hash });
  const receipt = mergeReceipts(waitedReceipt, fullReceipt);
  assertExecutionSucceeded(hash, receipt);
  return { hash, receipt };
}
