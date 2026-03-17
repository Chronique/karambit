"use client";
// hooks/useYieldProtocol.ts
// @stacks/connect v8 API - pakai request('stx_callContract') bukan openContractCall

import { useState, useEffect, useCallback } from "react";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  Cl,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

// ============================================================
// Types
// ============================================================

export interface VaultInfo {
  maturityBlock: number;
  totalLocked: number;
  totalYield: number;
  impliedApy: number;
  isMature: boolean;
  blocksUntilMaturity: number;
  estimatedDaysLeft: number;
}

export interface UserPosition {
  ptBalance: number;
  ytBalance: number;
  pendingYield: number;
  syBalance: number;
}

// ============================================================
// Config
// ============================================================

export const DEPLOYER = "ST3CM1955QMJ712DDV0C0F0KE205XQQT4CRZ3R3N2";
const NETWORK = STACKS_TESTNET;
const BLOCKS_PER_DAY = 144;
const PRECISION = 100_000_000;

const CONTRACTS = {
  vault:  "kbt-vault4",
  pt:     "kbt-pt4",
  yt:     "kbt-yt4",
  sy:     "kbt-sy",
  ststx:  "kbt-ststx",
} as const;

// ============================================================
// Helpers
// ============================================================

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

// v8: getUserAddress pakai getLocalStorage dari @stacks/connect
async function getUserAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getLocalStorage } = await import("@stacks/connect");
    const userData = getLocalStorage();
    // v8 format: addresses.stx[0].address
    const stxAddr = (userData as any)?.addresses?.stx?.[0]?.address;
    if (stxAddr) return stxAddr;
    // fallback ke format lama
    const stored = localStorage.getItem("stacks-session");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.userData?.profile?.stxAddress?.testnet ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================================
// Main Hook
// ============================================================

export function useYieldProtocol(address?: string | null) {
  const [vaultInfo, setVaultInfo]       = useState<VaultInfo | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // ── Fetch vault info ───────────────────────────────────────

  const fetchVaultInfo = useCallback(async () => {
    try {
      const [matBlock, totalLocked, totalYield, impliedApy, isMature, blocksLeft] =
        await Promise.all([
          readContract(CONTRACTS.vault, "get-maturity-block"),
          readContract(CONTRACTS.vault, "get-total-locked"),
          readContract(CONTRACTS.vault, "get-total-yield"),
          readContract(CONTRACTS.vault, "get-implied-apy"),
          readContract(CONTRACTS.vault, "is-mature"),
          readContract(CONTRACTS.vault, "blocks-until-maturity"),
        ]);

      const blocksLeftNum = Number(cvToValue(blocksLeft));
      setVaultInfo({
        maturityBlock:       Number(cvToValue(matBlock)),
        totalLocked:         Number(cvToValue(totalLocked)) / PRECISION,
        totalYield:          Number(cvToValue(totalYield))  / PRECISION,
        impliedApy:          Number(cvToValue(impliedApy))  / PRECISION,
        isMature:            Boolean(cvToValue(isMature)),
        blocksUntilMaturity: blocksLeftNum,
        estimatedDaysLeft:   Math.floor(blocksLeftNum / BLOCKS_PER_DAY),
      });
    } catch (err) {
      console.error("fetchVaultInfo:", err);
      setError("Gagal load vault info");
    }
  }, []);

  // ── Fetch user position ────────────────────────────────────

  const fetchUserPosition = useCallback(async (addr: string) => {
    try {
      const principal = principalCV(addr);
      const [ptBal, ytBal, pendingYield, syBal] = await Promise.all([
        readContract(CONTRACTS.pt,  "get-balance",       [principal], addr),
        readContract(CONTRACTS.yt,  "get-balance",       [principal], addr),
        readContract(CONTRACTS.yt,  "get-pending-yield", [principal], addr),
        readContract(CONTRACTS.sy,  "get-balance",       [principal], addr),
      ]);
      setUserPosition({
        ptBalance:    Number(cvToValue(ptBal))        / PRECISION,
        ytBalance:    Number(cvToValue(ytBal))        / PRECISION,
        pendingYield: Number(cvToValue(pendingYield)) / PRECISION,
        syBalance:    Number(cvToValue(syBal))        / PRECISION,
      });
    } catch (err) {
      console.error("fetchUserPosition:", err);
    }
  }, []);

  // ── Write helper: v8 pakai request('stx_callContract') ────

  async function callContract(
    contractName: string,
    functionName: string,
    functionArgs: any[],
    onDone?: () => void
  ): Promise<string> {
    const { request } = await import("@stacks/connect");
    const response = await request("stx_callContract", {
  contract: `${DEPLOYER}.${contractName}`,
  functionName,
  functionArgs,
  network: "testnet",
});
    setLoading(false);
    onDone?.();
    return response.txid ?? "";
  }

  // ── Mint PT + YT ───────────────────────────────────────────

  const mintPtYt = useCallback(async (syAmountFloat: number): Promise<string> => {
    const addr = address ?? await getUserAddress();
    if (!addr) throw new Error("Wallet tidak terkoneksi");
    setLoading(true);
    setError(null);
    try {
      return await callContract(
        CONTRACTS.vault, "mint-pt-yt",
        [Cl.uint(Math.floor(syAmountFloat * PRECISION))],
        () => setTimeout(() => fetchUserPosition(addr), 3000)
      );
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [address, fetchUserPosition]);

  // ── Redeem PT ──────────────────────────────────────────────

  const redeemPt = useCallback(async (ptAmountFloat: number): Promise<string> => {
    if (!vaultInfo?.isMature) throw new Error("Vault belum mature");
    setLoading(true);
    try {
      return await callContract(
        CONTRACTS.vault, "redeem-pt",
        [Cl.uint(Math.floor(ptAmountFloat * PRECISION))]
      );
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [vaultInfo]);

  // ── Early exit ─────────────────────────────────────────────

  const redeemEarly = useCallback(async (amountFloat: number): Promise<string> => {
    setLoading(true);
    try {
      return await callContract(
        CONTRACTS.vault, "redeem-early",
        [Cl.uint(Math.floor(amountFloat * PRECISION))]
      );
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  // ── Claim yield ────────────────────────────────────────────

  const claimYield = useCallback(async (): Promise<string> => {
    if (!userPosition?.pendingYield) throw new Error("Tidak ada yield");
    setLoading(true);
    try {
      return await callContract(CONTRACTS.vault, "claim-yield", []);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [userPosition]);

  // ── Preview deposit ────────────────────────────────────────

  const previewDeposit = useCallback(async (stSTXAmount: number) => {
    const result = await readContract(
      CONTRACTS.sy, "preview-deposit",
      [uintCV(Math.floor(stSTXAmount * PRECISION))]
    );
    return Number(cvToValue(result)) / PRECISION;
  }, []);

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    fetchVaultInfo();
    const t = setInterval(fetchVaultInfo, 30_000);
    return () => clearInterval(t);
  }, [fetchVaultInfo]);

  useEffect(() => {
    if (!address) return;
    fetchUserPosition(address);
    const t = setInterval(() => fetchUserPosition(address), 30_000);
    return () => clearInterval(t);
  }, [address, fetchUserPosition]);

  return {
    vaultInfo,
    userPosition,
    loading,
    error,
    mintPtYt,
    redeemPt,
    redeemEarly,
    claimYield,
    previewDeposit,
    refetch: () => {
      fetchVaultInfo();
      if (address) fetchUserPosition(address);
    },
  };
}