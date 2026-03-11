import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { uintCV, boolCV } from "@stacks/transactions";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("strategy-stackingdao", () => {
  it("deposit: tracking benar", () => {
    const amount = 50_000_000n;
    const { result } = simnet.callPublicFn(
      "strategy-stackingdao", "deposit", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw: berhasil setelah deposit", () => {
    const amount = 50_000_000n;
    simnet.callPublicFn("strategy-stackingdao", "deposit", [uintCV(amount)], deployer);
    const { result } = simnet.callPublicFn(
      "strategy-stackingdao", "withdraw", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw melebihi deposit: error 502", () => {
    const { result } = simnet.callPublicFn(
      "strategy-stackingdao", "withdraw", [uintCV(999_999n)], deployer
    );
    expect(result).toBeErr(uintCV(502n));
  });

  it("get-apy: default 800 bps (8%)", () => {
    const { result } = simnet.callReadOnlyFn(
      "strategy-stackingdao", "get-apy", [], deployer
    );
    expect(result).toBeOk(uintCV(800n));
  });

  it("update-apy: owner bisa update", () => {
    const { result } = simnet.callPublicFn(
      "strategy-stackingdao", "update-apy", [uintCV(900n)], deployer
    );
    expect(result).toBeOk(boolCV(true));
  });

  it("update-apy: non-owner ditolak", () => {
    const { result } = simnet.callPublicFn(
      "strategy-stackingdao", "update-apy", [uintCV(500n)], wallet1
    );
    expect(result).toBeErr(uintCV(500n));
  });
});