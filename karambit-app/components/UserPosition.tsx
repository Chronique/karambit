"use client";
import { useEffect, useState } from "react";
import { getUserShares, getUserAssets, getPricePerShare, satsToBtc, buildWithdrawTx } from "@/lib/stacks";

interface Props {
  address: string;
}

export default function UserPosition({ address }: Props) {
  const [shares, setShares] = useState(0);
  const [assets, setAssets] = useState(0);
  const [pricePerShare, setPricePerShare] = useState(1);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [s, a, p] = await Promise.all([
        getUserShares(address),
        getUserAssets(address),
        getPricePerShare(),
      ]);
      setShares(s);
      setAssets(a);
      setPricePerShare(p);
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 15000); // refresh 15s
    return () => clearInterval(interval);
  }, [address]);

  const handleWithdraw = async () => {
    if (!shares) return;
    setWithdrawing(true);
    try {
      const txOptions = buildWithdrawTx(shares);
      const provider = (window as any).LeatherProvider
        ?? (window as any).XverseProviders?.StacksProvider;
      const response = await provider.request("stx_callContract", txOptions);
      setTxId(response?.result?.txid ?? "submitted");
    } catch (e) {
      console.error(e);
    }
    setWithdrawing(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading position...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Position</h2>
        <button
          onClick={() => { setLoading(true); getUserAssets(address).then(a => { setAssets(a); setLoading(false); }); }}
          className="text-xs text-gray-400 hover:text-white"
        >
          ↻ Refresh
        </button>
      </div>

      {shares === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No position yet</p>
          <p className="text-sm mt-1">Deposit sBTC to start earning</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="text-gray-400">Deposited Value</span>
              <span className="font-bold">{satsToBtc(assets)} BTC</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="text-gray-400">Shares</span>
              <span className="text-sm text-gray-400">{shares.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Price/Share</span>
              <span className="text-orange-400">{pricePerShare.toFixed(6)}</span>
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full mt-6 border border-orange-500 text-orange-400 hover:bg-orange-900/30 disabled:opacity-50 font-bold py-3 rounded-lg transition"
          >
            {withdrawing ? "Confirming..." : "Withdraw All sBTC"}
          </button>

          {txId && (
            <div className="mt-3 p-3 bg-green-900/30 rounded-lg">
              <p className="text-green-400 text-sm">Withdraw submitted!</p>
              <a
                href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                target="_blank"
                className="text-xs text-gray-400 underline"
              >
                View on Explorer →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}