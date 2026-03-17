"use client";
// hooks/useWrapSy.ts
// Hook untuk deposit stSTX -> sySTX dan redeem sySTX -> stSTX

import { useState, useEffect, useCallback } from "react";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

const DEPLOYER = "ST3CM1955QMJ712DDV0C0F0KE205XQQT4CRZ3R3N2";
const NETWORK = STACKS_TESTNET;
const PRECISION = 100_000_000;

async function readContract(
  contractName: string,
  functionName: string,
  functionArgs: any[] = [],
  senderAddress = DEPLOYER
) {
  return fetchCallReadOnlyFunction({
    network: NETWORK,
    contractAddress: DEPLOYER,
    contractName,
    functionName,
    functionArgs,
    senderAddress,
  });
}

async function callContract(
  contractName: string,
  functionName: string,
  functionArgs: any[]
): Promise<string> {
  const { request } = await import("@stacks/connect");
  const response = await request("stx_callContract", {
    contract: `${DEPLOYER}.${contractName}`,
    functionName,
    functionArgs,
    network: "testnet",
  });
  return response.txid ?? "";
}

export function useWrapSy(address?: string | null) {
  const [ststxBalance, setStstxBalance] = useState(0);
  const [syBalance, setSyBalance]       = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetchBalances = useCallback(async (addr: string) => {
    try {
      const principal = principalCV(addr);
      const [ststx, sy, rate] = await Promise.all([
        readContract("kbt-ststx", "get-balance", [principal], addr),
        readContract("kbt-sy",    "get-balance", [principal], addr),
        readContract("kbt-sy",    "get-exchange-rate"),
      ]);
      setStstxBalance(Number(cvToValue(ststx)) / PRECISION);
      setSyBalance(Number(cvToValue(sy)) / PRECISION);
      // exchange rate: berapa stSTX per 1 sySTX
      setExchangeRate(Number(cvToValue(rate)) / PRECISION);
    } catch (err) {
      console.error("fetchBalances:", err);
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    fetchBalances(address);
    const t = setInterval(() => fetchBalances(address), 30_000);
    return () => clearInterval(t);
  }, [address, fetchBalances]);

  // Deposit stSTX -> sySTX
  const depositToSy = useCallback(async (ststxAmountFloat: number): Promise<string> => {
    if (!address) throw new Error("Wallet tidak terkoneksi");
    setLoading(true);
    setError(null);
    try {
      const amount = Math.floor(ststxAmountFloat * PRECISION);
      const txId = await callContract("kbt-sy", "deposit", [uintCV(amount)]);
      setTimeout(() => fetchBalances(address), 3000);
      return txId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, fetchBalances]);

  // Redeem sySTX -> stSTX
  const redeemFromSy = useCallback(async (syAmountFloat: number): Promise<string> => {
    if (!address) throw new Error("Wallet tidak terkoneksi");
    setLoading(true);
    setError(null);
    try {
      const amount = Math.floor(syAmountFloat * PRECISION);
      const txId = await callContract("kbt-sy", "redeem", [uintCV(amount)]);
      setTimeout(() => fetchBalances(address), 3000);
      return txId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, fetchBalances]);

  return {
    ststxBalance,
    syBalance,
    exchangeRate,
    loading,
    error,
    depositToSy,
    redeemFromSy,
    refetch: () => address && fetchBalances(address),
  };
}
