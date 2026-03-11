// lib/stacks.ts
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
} from "@stacks/transactions";
import { NETWORK, CONTRACTS, DEPLOYER } from "./contracts";

export async function getUserShares(userAddress: string): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      network: NETWORK,
      contractAddress: CONTRACTS.vault.address,
      contractName: CONTRACTS.vault.name,
      functionName: "get-shares",
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });
    return Number(cvToValue(result));
  } catch { return 0; }
}

export async function getUserAssets(userAddress: string): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      network: NETWORK,
      contractAddress: CONTRACTS.vault.address,
      contractName: CONTRACTS.vault.name,
      functionName: "get-user-assets",
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });
    return Number(cvToValue(result));
  } catch { return 0; }
}

export async function getPricePerShare(): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      network: NETWORK,
      contractAddress: CONTRACTS.vault.address,
      contractName: CONTRACTS.vault.name,
      functionName: "get-price-per-share",
      functionArgs: [],
      senderAddress: DEPLOYER,
    });
    return Number(cvToValue(result)) / 1e8;
  } catch { return 1; }
}

export function buildDepositTx(amountSats: number) {
  return {
    contractAddress: CONTRACTS.vault.address,
    contractName: CONTRACTS.vault.name,
    functionName: "deposit",
    functionArgs: [uintCV(amountSats)],
    network: NETWORK,
    postConditions: [],
  };
}

export function buildWithdrawTx(shares: number) {
  return {
    contractAddress: CONTRACTS.vault.address,
    contractName: CONTRACTS.vault.name,
    functionName: "withdraw",
    functionArgs: [uintCV(shares)],
    network: NETWORK,
    postConditions: [],
  };
}

export function btcToSats(btc: number): number {
  return Math.floor(btc * 1e8);
}

export function satsToBtc(sats: number): string {
  return (sats / 1e8).toFixed(8);
}