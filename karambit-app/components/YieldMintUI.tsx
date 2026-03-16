"use client";

import { useState } from "react";
import { useYieldProtocol } from "../src/hooks/useYieldProtocol";

// ── Vault Stats ───────────────────────────────────────────────

function StatCard({
  label, value, accent, highlight,
}: {
  label: string; value: string; accent?: boolean; highlight?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${accent ? "text-yellow-400" : highlight ? "text-green-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function VaultStatsBanner({ vaultInfo }: { vaultInfo: NonNullable<ReturnType<typeof useYieldProtocol>["vaultInfo"]> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard label="Implied APY" value={`${(vaultInfo.impliedApy * 100).toFixed(2)}%`} accent />
      <StatCard label="Total Locked" value={`${vaultInfo.totalLocked.toLocaleString(undefined, { maximumFractionDigits: 2 })} sySTX`} />
      <StatCard label="Yield Collected" value={`${vaultInfo.totalYield.toFixed(4)} stSTX`} />
      <StatCard
        label={vaultInfo.isMature ? "Status" : "Matures In"}
        value={vaultInfo.isMature ? "Matured" : `~${vaultInfo.estimatedDaysLeft} days`}
        highlight={vaultInfo.isMature}
      />
    </div>
  );
}

// ── Amount Input (no spinner arrows) ─────────────────────────

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
        style={{ MozAppearance: "textfield" } as any}
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

// ── Tx Success ────────────────────────────────────────────────

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

// ── Mint Tab ──────────────────────────────────────────────────

function MintTab({ onMint, loading, syBalance }: {
  onMint: (amount: number) => Promise<string>;
  loading: boolean;
  syBalance: number;
}) {
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState<string | null>(null);

  const handleMint = async () => {
    if (!amount || isNaN(Number(amount))) return;
    try {
      const tx = await onMint(Number(amount));
      setTxId(tx);
      setAmount("");
    } catch (e: any) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-400 mb-3">
          Deposit sySTX to receive PT + YT tokens (1:1 ratio)
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400">You receive:</p>
            <p className="text-blue-400 font-medium mt-1">PT-stSTX — Principal Token</p>
            <p className="text-zinc-500 mt-1">Redeem 1:1 at maturity</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400">You receive:</p>
            <p className="text-yellow-400 font-medium mt-1">YT-stSTX — Yield Token</p>
            <p className="text-zinc-500 mt-1">Earn all yield during period</p>
          </div>
        </div>

        <AmountInput
          value={amount}
          onChange={setAmount}
          onMax={() => setAmount(syBalance.toString())}
          unit="sySTX"
        />
        <p className="text-xs text-zinc-500 mt-2">Balance: {syBalance.toFixed(4)} sySTX</p>

        {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
          <div className="mt-3 p-3 bg-zinc-800 rounded-lg text-xs text-zinc-300 space-y-1">
            <p>→ Receive {Number(amount).toFixed(4)} <span className="text-blue-400">PT-stSTX</span></p>
            <p>→ Receive {Number(amount).toFixed(4)} <span className="text-yellow-400">YT-stSTX</span></p>
          </div>
        )}
      </div>

      <button
        onClick={handleMint}
        disabled={loading || !amount || Number(amount) <= 0}
        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition"
      >
        {loading ? "Processing..." : "Mint PT + YT"}
      </button>

      {txId && <TxSuccess txId={txId} onDismiss={() => setTxId(null)} />}
    </div>
  );
}

// ── Redeem Tab ────────────────────────────────────────────────

function RedeemTab({ onRedeemPt, onRedeemEarly, loading, ptBalance, ytBalance, isMature }: {
  onRedeemPt: (amount: number) => Promise<string>;
  onRedeemEarly: (amount: number) => Promise<string>;
  loading: boolean;
  ptBalance: number;
  ytBalance: number;
  isMature: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState<string | null>(null);
  const [mode, setMode] = useState<"mature" | "early">("mature");

  const handleRedeem = async () => {
    if (!amount || isNaN(Number(amount))) return;
    try {
      const tx = mode === "mature"
        ? await onRedeemPt(Number(amount))
        : await onRedeemEarly(Number(amount));
      setTxId(tx);
      setAmount("");
    } catch (e: any) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
        {(["mature", "early"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === m ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {m === "mature" ? `Redeem PT ${isMature ? "✅" : ""}` : "Early Exit"}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <p className="text-xs text-zinc-400">
          {mode === "mature"
            ? isMature
              ? "Vault matured. Redeem PT-stSTX → sySTX (1:1)."
              : "⏳ Vault not yet matured. Wait until the period ends to redeem PT."
            : "Exit early. Return equal amounts of PT + YT to receive sySTX back."}
        </p>

        <AmountInput
          value={amount}
          onChange={setAmount}
          onMax={() => setAmount((mode === "mature" ? ptBalance : Math.min(ptBalance, ytBalance)).toString())}
          unit={mode === "mature" ? "PT" : "PT+YT"}
          disabled={mode === "mature" && !isMature}
        />

        <div className="text-xs text-zinc-500 space-y-1">
          <p>PT Balance: {ptBalance.toFixed(4)}</p>
          <p>YT Balance: {ytBalance.toFixed(4)}</p>
        </div>
      </div>

      <button
        onClick={handleRedeem}
        disabled={loading || !amount || Number(amount) <= 0 || (mode === "mature" && !isMature)}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {loading ? "Processing..." : mode === "mature" ? "Redeem PT" : "Early Exit"}
      </button>

      {txId && <TxSuccess txId={txId} onDismiss={() => setTxId(null)} />}
    </div>
  );
}

// ── Claim Yield Tab ───────────────────────────────────────────

function ClaimYieldTab({ onClaim, loading, pendingYield }: {
  onClaim: () => Promise<string>;
  loading: boolean;
  pendingYield: number;
}) {
  const [txId, setTxId] = useState<string | null>(null);

  const handleClaim = async () => {
    try {
      const tx = await onClaim();
      setTxId(tx);
    } catch (e: any) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <p className="text-xs text-zinc-500 mb-2">Claimable Yield (stSTX)</p>
        <p className="text-4xl font-bold text-yellow-400 mb-1">{pendingYield.toFixed(6)}</p>
        <p className="text-xs text-zinc-500">stSTX</p>
        {pendingYield === 0 && (
          <p className="mt-4 text-sm text-zinc-600">
            No yield yet. Hold YT-stSTX to start accumulating yield.
          </p>
        )}
      </div>

      <button
        onClick={handleClaim}
        disabled={loading || pendingYield === 0}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {loading ? "Claiming..." : `Claim ${pendingYield.toFixed(4)} stSTX`}
      </button>

      {txId && <TxSuccess txId={txId} onDismiss={() => setTxId(null)} />}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

type Tab = "mint" | "redeem" | "yield";

export default function YieldMintUI() {
  const { vaultInfo, userPosition, loading, error, mintPtYt, redeemPt, redeemEarly, claimYield } =
    useYieldProtocol();
  const [activeTab, setActiveTab] = useState<Tab>("mint");

  if (!vaultInfo) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "mint",   label: "Mint PT + YT" },
    { id: "redeem", label: "Redeem" },
    { id: "yield",  label: `Claim Yield${userPosition?.pendingYield ? ` (${userPosition.pendingYield.toFixed(4)})` : ""}` },
  ];

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Yield Tokenization</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Split stSTX yield into PT (principal) + YT (yield) — powered by Karambit
        </p>
      </div>

      <VaultStatsBanner vaultInfo={vaultInfo} />

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "text-yellow-400 border-b-2 border-yellow-400 bg-zinc-800/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === "mint" && (
            <MintTab onMint={mintPtYt} loading={loading} syBalance={userPosition?.syBalance ?? 0} />
          )}
          {activeTab === "redeem" && (
            <RedeemTab
              onRedeemPt={redeemPt} onRedeemEarly={redeemEarly} loading={loading}
              ptBalance={userPosition?.ptBalance ?? 0} ytBalance={userPosition?.ytBalance ?? 0}
              isMature={vaultInfo.isMature}
            />
          )}
          {activeTab === "yield" && (
            <ClaimYieldTab onClaim={claimYield} loading={loading} pendingYield={userPosition?.pendingYield ?? 0} />
          )}
        </div>
      </div>

      {userPosition && (
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-3 font-medium">Your Position</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-blue-400 font-semibold text-sm">{userPosition.ptBalance.toFixed(4)}</p>
              <p className="text-xs text-zinc-600">PT-stSTX</p>
            </div>
            <div>
              <p className="text-yellow-400 font-semibold text-sm">{userPosition.ytBalance.toFixed(4)}</p>
              <p className="text-xs text-zinc-600">YT-stSTX</p>
            </div>
            <div>
              <p className="text-green-400 font-semibold text-sm">{userPosition.pendingYield.toFixed(4)}</p>
              <p className="text-xs text-zinc-600">Pending Yield</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}