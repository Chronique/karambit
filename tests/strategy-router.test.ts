import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { uintCV, tupleCV, boolCV } from "@stacks/transactions";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("strategy-router", () => {
  it("default: active strategy = 0 (zest)", () => {
    const { result } = simnet.callReadOnlyFn(
      "strategy-router", "get-active-strategy", [], deployer
    );
    expect(result).toBeOk(uintCV(0n));
  });

  it("get-best-strategy: bitflow menang jika APY tertinggi", () => {
    // Default: zest=700, bitflow=1000, stackingdao=800
    // Bitflow harusnya menang
    const { result } = simnet.callReadOnlyFn(
      "strategy-router", "get-best-strategy", [], deployer
    );
    expect(result).toBeOk(uintCV(1n)); // 1 = bitflow
  });

  it("update-apy-zest: owner bisa update dan auto rebalance", () => {
    // Set zest APY = 2000 (tertinggi)
    const { result } = simnet.callPublicFn(
      "strategy-router", "update-apy-zest", [uintCV(2000n)], deployer
    );
    expect(result).toBeOk(boolCV(true));

    // Active strategy harusnya pindah ke 0 (zest)
    const active = simnet.callReadOnlyFn(
      "strategy-router", "get-active-strategy", [], deployer
    );
    expect(active.result).toBeOk(uintCV(0n));
  });

  it("update-apy: non-owner ditolak", () => {
    const { result } = simnet.callPublicFn(
      "strategy-router", "update-apy-bitflow", [uintCV(500n)], wallet1
    );
    expect(result).toBeErr(uintCV(300n));
  });
});