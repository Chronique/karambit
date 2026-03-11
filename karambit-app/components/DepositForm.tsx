"use client";
import { useState } from "react";
import { buildDepositTx, btcToSats } from "@/lib/stacks";

interface Props {
  address: string;
}

export default function DepositForm({ address }: Props) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const sats = btcToSats(Number(amount));
      const txOptions = buildDepositTx(sats);

      const provider = (window as any).LeatherProvider
        ?? (window as any).XverseProviders?.StacksProvider;

      if (!provider) throw new Error("No wallet found");

      const response = await provider.request("stx_callContract", {
        ...txOptions,
        functionArgs: txOptions.functionArgs.map((arg: any) => arg),
      });

      setTxId(response?.result?.txid ?? "submitted");
      setAmount("");
    } catch (e: any) {
      setError(e.message ?? "Transaction failed");
    }

    setLoading(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Deposit sBTC</h2>

      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Amount (BTC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={() => setAmount("0.001")}
            className="text-xs text-orange-400 border border-orange-800 px-3 rounded-lg hover:bg-orange-900/30"
          >
            MIN
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Estimated APY</span>
          <span className="text-green-400 font-bold">10.0%</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Strategy</span>
          <span className="text-orange-400">BitFlow (Best)</span>
        </div>
        {amount && (
          <div className="flex justify-between mt-1">
            <span>Amount in sats</span>
            <span>{btcToSats(Number(amount)).toLocaleString()} sats</span>
          </div>
        )}
      </div>

      <button
        onClick={handleDeposit}
        disabled={loading || !amount}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition"
      >
        {loading ? "Confirming in wallet..." : "Deposit sBTC"}
      </button>

      {txId && (
        <div className="mt-3 p-3 bg-green-900/30 rounded-lg">
          <p className="text-green-400 text-sm">Deposit submitted!</p>
          <a
            href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
            target="_blank"
            className="text-xs text-gray-400 hover:text-white underline"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-3">{error}</p>
      )}
    </div>
  );
}