"use client";
import { useState } from "react";
import WalletConnect from "../../components/WalletConnect";
import APYTable from "../../components/APYTable";
import DepositForm from "../../components/DepositForm";
import UserPosition from "../../components/UserPosition";

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-orange-400">⚔️ Karambit</h1>
          <p className="text-gray-400 mt-1">sBTC Yield Aggregator on Bitcoin L2</p>
        </div>
        <WalletConnect address={address} setAddress={setAddress} />
      </div>

      {/* APY Table */}
      <APYTable />

      {/* Deposit & Position */}
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
  );
}