"use client";
// src/hooks/useYieldProtocol.ts
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
  AnchorMode,
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

function cvToNumber(cv: any): number {
  const raw = cvToValue(cv);
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    return Number(raw.value);
  }
  return Number(raw);
}

function cvToBool(cv: any): boolean {
  const raw = cvToValue(cv);
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    return Boolean(raw.value);
  }
  return Boolean(raw);
}

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

// ============================================================
// Main Hook
// ============================================================

export function useYieldProtocol(walletAddress?: string | null) {
  const [vaultInfo, setVaultInfo]       = useState<VaultInfo | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const addressRef = useRef<string | null>(walletAddress ?? null);
  useEffect(() => {
    addressRef.current = walletAddress ?? null;
  }, [walletAddress]);

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

      const blocksLeftNum = cvToNumber(blocksLeft);
      setVaultInfo({
        maturityBlock:       cvToNumber(matBlock),
        totalLocked:         cvToNumber(totalLocked) / PRECISION,
        totalYield:          cvToNumber(totalYield)  / PRECISION,
        impliedApy:          cvToNumber(impliedApy)  / PRECISION,
        isMature:            cvToBool(isMature),
        blocksUntilMaturity: blocksLeftNum,
        estimatedDaysLeft:   Math.floor(blocksLeftNum / BLOCKS_PER_DAY),
      });
    } catch (err) {
      console.error("fetchVaultInfo:", err);
      setError("Failed to load vault info");
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
        ptBalance:    cvToNumber(ptBal)        / PRECISION,
        ytBalance:    cvToNumber(ytBal)        / PRECISION,
        pendingYield: cvToNumber(pendingYield) / PRECISION,
        syBalance:    cvToNumber(syBal)        / PRECISION,
      });
    } catch (err) {
      console.error("fetchUserPosition:", err);
    }
  }, []);

  // ── Write helper - lazy import to avoid SSR ───────────────

  async function callContract(
    contractName: string,
    functionName: string,
    functionArgs: any[],
    onDone?: () => void
  ): Promise<string> {
    // dynamic import keeps @stacks/connect out of SSR bundle
    const { openContractCall } = await import("@stacks/connect");
    return new Promise((resolve, reject) => {
      openContractCall({
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        contractAddress: DEPLOYER,
        contractName,
        functionName,
        functionArgs,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
        onFinish: (data: { txId: string }) => {
          setLoading(false);
          onDone?.();
          resolve(data.txId);
        },
        onCancel: () => {
          setLoading(false);
          reject(new Error("User cancelled"));
        },
      });
    });
  }

  // ── Actions ────────────────────────────────────────────────

  const mintPtYt = useCallback(async (syAmountFloat: number): Promise<string> => {
    const addr = addressRef.current;
    if (!addr) throw new Error("Wallet not connected");
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
  }, [fetchUserPosition]);

  const redeemPt = useCallback(async (ptAmountFloat: number): Promise<string> => {
    if (!vaultInfo?.isMature) throw new Error("Vault not yet matured");
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

  const claimYield = useCallback(async (): Promise<string> => {
    if (!userPosition?.pendingYield) throw new Error("No yield to claim");
    setLoading(true);
    try {
      return await callContract(CONTRACTS.vault, "claim-yield", []);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [userPosition]);

  const previewDeposit = useCallback(async (stSTXAmount: number) => {
    const result = await readContract(
      CONTRACTS.sy, "preview-deposit",
      [uintCV(Math.floor(stSTXAmount * PRECISION))]
    );
    return cvToNumber(result) / PRECISION;
  }, []);

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    fetchVaultInfo();
    const t = setInterval(fetchVaultInfo, 30_000);
    return () => clearInterval(t);
  }, [fetchVaultInfo]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchUserPosition(walletAddress);
    const t = setInterval(() => fetchUserPosition(walletAddress), 30_000);
    return () => clearInterval(t);
  }, [fetchUserPosition, walletAddress]);

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
      if (addressRef.current) fetchUserPosition(addressRef.current);
    },
  };
}