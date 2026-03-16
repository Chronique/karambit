"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WalletConnect from "../../components/WalletConnect";
import DepositForm from "../../components/DepositForm";
import UserPosition from "../../components/UserPosition";
import { StrategyTable } from "../../components/StrategyTable";

// ssr: false agar @stacks/connect tidak diload saat server-side render
const YieldMintUI = dynamic(() => import("../../components/YieldMintUI"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
    </div>
  ),
});

const queryClient = new QueryClient();

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"strategies" | "yield">("strategies");

  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-black text-white p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo-64.png" alt="Karambit" className="w-10 h-10 rounded-full" />
              <h1 className="text-4xl font-bold text-orange-400">Karambit</h1>
            </div>
            <p className="text-gray-400 mt-1">sBTC Yield Aggregator on Bitcoin L2</p>
          </div>
          <WalletConnect address={address} setAddress={setAddress} />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit mb-8">
          <button
            onClick={() => setActiveTab("strategies")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "strategies"
                ? "bg-orange-500 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Strategies
          </button>
          <button
            onClick={() => setActiveTab("yield")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "yield"
                ? "bg-orange-500 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Yield Tokenization ✨
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "strategies" && (
          <>
            <StrategyTable />
            {address && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <DepositForm address={address} />
                <UserPosition address={address} />
              </div>
            )}
            {!address && (
              <div className="text-center mt-16 text-gray-500">
                Connect your wallet to deposit sBTC and start earning yield
              </div>
            )}
          </>
        )}

        {activeTab === "yield" && (
          <div className="max-w-lg">
            <YieldMintUI address={address} />
          </div>
        )}

      </main>
    </QueryClientProvider>
  );
}