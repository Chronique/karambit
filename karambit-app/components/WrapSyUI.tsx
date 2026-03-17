"use client";
// components/WrapSyUI.tsx
// Deposit stSTX -> sySTX (Wrap) dan Redeem sySTX -> stSTX (Unwrap)

import { useState } from "react";
import { useWrapSy } from "../src/hooks/useWrapSy";

function TxSuccess({ txId, onDismiss }: { txId: string; onDismiss: () => void }) {
  return (
    <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-green-400 text-sm font-medium">Transaction submitted ✓</p>
        <a
          href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-600 hover:text-green-400 underline"
        >
          {txId.slice(0, 12)}...{txId.slice(-8)}
        </a>
      </div>
      <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-300 text-lg ml-4">×</button>
    </div>
  );
}

function AmountInput({
  value, onChange, onMax, unit, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onMax: () => void;
  unit: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^\d*\.?\d*$/.test(v)) onChange(v);
        }}
        placeholder="0.00"
        disabled={disabled}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 pr-28 disabled:opacity-50"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <button onClick={onMax} className="text-xs text-yellow-500 hover:text-yellow-400 font-medium">
          MAX
        </button>
        <span className="text-zinc-400 text-sm">{unit}</span>
      </div>
    </div>
  );
}

type Tab = "wrap" | "unwrap";

export default function WrapSyUI({ address }: { address?: string | null }) {
  const {
    ststxBalance,
    syBalance,
    exchangeRate,
    loading,
    error,
    depositToSy,
    redeemFromSy,
  } = useWrapSy(address);

  const [activeTab, setActiveTab] = useState<Tab>("wrap");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    try {
      const tx = activeTab === "wrap"
        ? await depositToSy(Number(amount))
        : await redeemFromSy(Number(amount));
      setTxId(tx);
      setAmount("");
    } catch (e: any) {
      console.error(e);
    }
  };

  const maxBalance = activeTab === "wrap" ? ststxBalance : syBalance;
  const previewAmount = amount && !isNaN(Number(amount))
    ? activeTab === "wrap"
      ? (Number(amount) / exchangeRate).toFixed(4)
      : (Number(amount) * exchangeRate).toFixed(4)
    : null;

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Wrap / Unwrap</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Convert stSTX to sySTX to use in Yield Tokenization
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">stSTX Balance</p>
          <p className="text-lg font-semibold text-white">{ststxBalance.toFixed(4)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">sySTX Balance</p>
          <p className="text-lg font-semibold text-yellow-400">{syBalance.toFixed(4)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Exchange Rate</p>
          <p className="text-lg font-semibold text-white">
            {exchangeRate === 1 ? "1:1" : exchangeRate.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-800">
          {(["wrap", "unwrap"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setAmount(""); setTxId(null); }}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "text-yellow-400 border-b-2 border-yellow-400 bg-zinc-800/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "wrap" ? "Wrap stSTX → sySTX" : "Unwrap sySTX → stSTX"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-400">
              {activeTab === "wrap"
                ? "Deposit stSTX to receive sySTX. sySTX accumulates yield from StackingDAO."
                : "Redeem sySTX to receive stSTX + accrued yield back."}
            </p>

            <AmountInput
              value={amount}
              onChange={setAmount}
              onMax={() => setAmount(maxBalance.toFixed(8))}
              unit={activeTab === "wrap" ? "stSTX" : "sySTX"}
            />

            <p className="text-xs text-zinc-500">
              Balance: {maxBalance.toFixed(4)} {activeTab === "wrap" ? "stSTX" : "sySTX"}
            </p>

            {previewAmount && Number(amount) > 0 && (
              <div className="p-3 bg-zinc-800 rounded-lg text-xs text-zinc-300">
                {activeTab === "wrap"
                  ? <>→ Receive <span className="text-yellow-400">{previewAmount} sySTX</span></>
                  : <>→ Receive <span className="text-green-400">{previewAmount} stSTX</span></>
                }
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !amount || Number(amount) <= 0 || !address}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition"
          >
            {loading
              ? "Processing..."
              : !address
              ? "Connect Wallet"
              : activeTab === "wrap"
              ? "Wrap stSTX"
              : "Unwrap sySTX"}
          </button>

          {txId && <TxSuccess txId={txId} onDismiss={() => setTxId(null)} />}
        </div>
      </div>

      {/* How to get stSTX */}
      <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 font-medium mb-2">Don't have stSTX?</p>
        <p className="text-xs text-zinc-600">
          On testnet, mint mock stSTX via{" "}
          <a
            href="https://explorer.hiro.so/sandbox/contract-call?chain=testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-600 hover:text-yellow-400 underline"
          >
            Hiro Explorer Sandbox
          </a>
          {" "}→ Contract: <code className="text-zinc-400">ST3CM...R3N2.kbt-ststx</code> → Function: <code className="text-zinc-400">mint</code>
        </p>
      </div>
    </div>
  );
}
