"use client";

import { useEffect } from "react";
import { useWallet } from "../store/useWallet";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, connecting, error, connect, disconnect, restore } = useWallet();

  useEffect(() => {
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="font-mono text-xs border border-verdict/60 text-verdict px-3 py-1.5 rounded-sm hover:bg-verdict/10 transition-colors"
        title="Click to disconnect"
      >
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={connecting}
        className="font-mono text-xs border border-gold/70 text-gold px-3 py-1.5 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && <span className="text-[10px] text-dispute max-w-[220px] text-right">{error}</span>}
    </div>
  );
}
