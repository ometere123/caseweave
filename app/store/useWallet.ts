import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "genlayer-js/types";
import {
  connectInjectedWallet,
  getAuthorizedAccount,
  onAccountsChanged,
} from "../lib/genlayer";

type WalletState = {
  address: Address | null;
  connecting: boolean;
  hydrated: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  restore: () => Promise<void>;
};

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      connecting: false,
      hydrated: false,
      error: null,
      connect: async () => {
        set({ connecting: true, error: null });
        try {
          const address = await connectInjectedWallet();
          set({ address, connecting: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Failed to connect wallet",
            connecting: false,
          });
        }
      },
      disconnect: () => set({ address: null }),
      restore: async () => {
        // Re-validate the persisted address against the wallet's currently
        // authorized accounts without prompting the user (eth_accounts, not
        // eth_requestAccounts), so a page refresh doesn't force a reconnect.
        //
        // Some extensions inject window.ethereum a tick after page load, so
        // if no provider is detected yet we keep the persisted address
        // rather than wiping a valid session - only an explicit "no
        // authorized accounts" response from a present provider clears it.
        if (typeof window === "undefined" || !window.ethereum) {
          set({ hydrated: true });
          return;
        }

        const authorized = await getAuthorizedAccount();
        set({ address: authorized, hydrated: true });

        onAccountsChanged((accounts) => {
          set({ address: (accounts[0] as Address) ?? null });
        });
      },
    }),
    {
      name: "caseweave-wallet",
      partialize: (state) => ({ address: state.address }),
    }
  )
);
