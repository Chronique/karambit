import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { uintCV, boolCV } from "@stacks/transactions";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("strategy-bitflow", () => {
  it("deposit: tracking benar", () => {
    const amount = 50_000_000n;
    const { result } = simnet.callPublicFn(
      "strategy-bitflow", "deposit", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw: berhasil setelah deposit", () => {
    const amount = 50_000_000n;
    simnet.callPublicFn("strategy-bitflow", "deposit", [uintCV(amount)], deployer);
    const { result } = simnet.callPublicFn(
      "strategy-bitflow", "withdraw", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw melebihi deposit: error 402", () => {
    const { result } = simnet.callPublicFn(
      "strategy-bitflow", "withdraw", [uintCV(999_999n)], deployer
    );
    expect(result).toBeErr(uintCV(402n));
  });

  it("get-apy: default 1000 bps (10%)", () => {
    const { result } = simnet.callReadOnlyFn(
      "strategy-bitflow", "get-apy", [], deployer
    );
    expect(result).toBeOk(uintCV(1000n));
  });

  it("update-apy: owner bisa update", () => {
    const { result } = simnet.callPublicFn(
      "strategy-bitflow", "update-apy", [uintCV(1200n)], deployer
    );
    expect(result).toBeOk(boolCV(true));
  });

  it("update-apy: non-owner ditolak", () => {
    const { result } = simnet.callPublicFn(
      "strategy-bitflow", "update-apy", [uintCV(500n)], wallet1
    );
    expect(result).toBeErr(uintCV(400n));
  });
});