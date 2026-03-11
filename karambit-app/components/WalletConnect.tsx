"use client";
import { useState } from "react";

interface Props {
  address: string | null;
  setAddress: (addr: string) => void;
}

export default function WalletConnect({ address, setAddress }: Props) {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      // Leather wallet (window.LeatherProvider)
      // Xverse wallet (window.XverseProviders)
      const provider = (window as any).LeatherProvider 
        ?? (window as any).XverseProviders?.StacksProvider;

      if (!provider) {
        alert("Please install Leather or Xverse wallet extension first!");
        setLoading(false);
        return;
      }

      const response = await provider.request("getAddresses");
      const stxAddress = response?.result?.addresses?.find(
        (a: any) => a.type === "p2pkh" || a.symbol === "STX"
      )?.address;

      if (stxAddress) setAddress(stxAddress);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-400 text-sm">
          ● {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => setAddress("")}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className="bg-orange-500 hover:bg-orange-400 disabled:bg-gray-700 text-black font-bold px-6 py-2 rounded-lg transition"
    >
      {loading ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}