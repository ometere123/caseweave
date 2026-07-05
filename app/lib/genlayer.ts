import { createClient, chains } from "genlayer-js";
import type { Address } from "genlayer-js/types";
import { CASEWEAVE_CONTRACT_ADDRESS } from "./contract";

declare global {
  interface Window {
    ethereum?: any;
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
  const accounts: string[] = await provider.request({
    method: "eth_requestAccounts",
  });
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
    // Wallet may already have the chain, or user rejected — non-fatal for read/demo purposes.
  }

  return accounts[0] as Address;
}

export async function getAuthorizedAccount(): Promise<Address | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const accounts: string[] = await window.ethereum.request({
      method: "eth_accounts",
    });
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

export async function readContract(functionName: string, args: unknown[] = []) {
  const client = getReadClient();
  return client.readContract({
    address: CASEWEAVE_CONTRACT_ADDRESS,
    functionName,
    args: args as any,
  });
}

export async function writeContract(
  account: Address,
  functionName: string,
  args: unknown[] = []
) {
  const client = getWriteClient(account);
  const hash = await client.writeContract({
    address: CASEWEAVE_CONTRACT_ADDRESS,
    functionName,
    args: args as any,
    value: BigInt(0),
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    retries: 60,
    interval: 3000,
  });
  return { hash, receipt };
}
