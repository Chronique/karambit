// hooks/useYieldProtocol.ts
// Fixed for @stacks/connect v8 + @stacks/transactions v7

import { useState, useEffect, useCallback } from "react";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
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

function getUserAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
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

  const fetchUserPosition = useCallback(async (address: string) => {
    try {
      const addr = principalCV(address);
      const [ptBal, ytBal, pendingYield, syBal] = await Promise.all([
        readContract(CONTRACTS.pt,  "get-balance",       [addr], address),
        readContract(CONTRACTS.yt,  "get-balance",       [addr], address),
        readContract(CONTRACTS.yt,  "get-pending-yield", [addr], address),
        readContract(CONTRACTS.sy,  "get-balance",       [addr], address),
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

  // ── Write helper ───────────────────────────────────────────

  async function callContract(
  contractName: string,
  functionName: string,
  functionArgs: any[],
  onDone?: () => void
): Promise<string> {
  const { openContractCall } = await import("@stacks/connect");
  return new Promise((resolve, reject) => {
    openContractCall({
      contractAddress: DEPLOYER,
      contractName,
      functionName,
      functionArgs,
      network: NETWORK,
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: (data) => {
        setLoading(false);
        onDone?.();
        resolve(data.txId);
      },
      onCancel: () => {
        setLoading(false);
        reject(new Error("User cancel"));
      },
    });
  });
}

  // ── Mint PT + YT ───────────────────────────────────────────

  const mintPtYt = useCallback(async (syAmountFloat: number): Promise<string> => {
    const addr = address;
    if (!addr) throw new Error("Wallet tidak terkoneksi");
    setLoading(true);
    setError(null);
    try {
      return await callContract(
        CONTRACTS.vault, "mint-pt-yt",
        [uintCV(Math.floor(syAmountFloat * PRECISION))],
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
        [uintCV(Math.floor(ptAmountFloat * PRECISION))]
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
        [uintCV(Math.floor(amountFloat * PRECISION))]
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
    const addr = address;
    if (!addr) return;
    fetchUserPosition(addr);
    const t = setInterval(() => fetchUserPosition(addr), 30_000);
    return () => clearInterval(t);
  }, [fetchUserPosition]);

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
      const addr = address;
      if (addr) fetchUserPosition(addr);
    },
  };
}