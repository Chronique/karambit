"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WalletConnect from "../../components/WalletConnect";
import APYTable from "../../components/APYTable";
import DepositForm from "../../components/DepositForm";
import UserPosition from "../../components/UserPosition";
import { StrategyTable } from "../../components/StrategyTable";

const queryClient = new QueryClient();

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-black text-white p-8">
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
      </main>
    </QueryClientProvider>
  );
}