import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { uintCV, boolCV } from "@stacks/transactions";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("strategy-zest", () => {
  it("deposit: tracking total-deposited benar", () => {
    const amount = 50_000_000n;
    const { result } = simnet.callPublicFn(
      "strategy-zest", "deposit", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));

    // Cek total-deposited terupdate
    const total = simnet.callReadOnlyFn(
      "strategy-zest", "get-total-value", [], deployer
    );
    expect(total.result).toBeOk(uintCV(amount));
  });

  it("withdraw: berhasil setelah deposit", () => {
    const amount = 50_000_000n;
    simnet.callPublicFn("strategy-zest", "deposit", [uintCV(amount)], deployer);

    const { result } = simnet.callPublicFn(
      "strategy-zest", "withdraw", [uintCV(amount)], deployer
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw melebihi deposit: error 203", () => {
    const { result } = simnet.callPublicFn(
      "strategy-zest", "withdraw", [uintCV(999_999n)], deployer
    );
    expect(result).toBeErr(uintCV(203n));
  });

  it("get-apy: default 700 bps (7%)", () => {
    const { result } = simnet.callReadOnlyFn(
      "strategy-zest", "get-apy", [], deployer
    );
    expect(result).toBeOk(uintCV(700n));
  });

  it("update-apy: owner bisa update", () => {
    const { result } = simnet.callPublicFn(
      "strategy-zest", "update-apy", [uintCV(900n)], deployer
    );
    expect(result).toBeOk(boolCV(true));

    const apy = simnet.callReadOnlyFn(
      "strategy-zest", "get-apy", [], deployer
    );
    expect(result).toBeOk(boolCV(true));
  });

  it("update-apy: non-owner ditolak", () => {
    const { result } = simnet.callPublicFn(
      "strategy-zest", "update-apy", [uintCV(500n)], wallet1
    );
    expect(result).toBeErr(uintCV(200n));
  });
});