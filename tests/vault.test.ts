import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { uintCV, boolCV } from "@stacks/transactions";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("vault", () => {
  it("deposit pertama: shares = amount", () => {
    const amount = 100_000_000n;
    const { result } = simnet.callPublicFn(
      "vault", "deposit", [uintCV(amount)], wallet1
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw: dapat sBTC kembali", () => {
    const amount = 100_000_000n;
    simnet.callPublicFn("vault", "deposit", [uintCV(amount)], wallet1);
    const { result } = simnet.callPublicFn(
      "vault", "withdraw", [uintCV(amount)], wallet1
    );
    expect(result).toBeOk(uintCV(amount));
  });

  it("withdraw tanpa deposit: error 101", () => {
    const { result } = simnet.callPublicFn(
      "vault", "withdraw", [uintCV(1000n)], wallet1
    );
    expect(result).toBeErr(uintCV(101n));
  });

  it("non-owner tidak bisa pause: error 100", () => {
    const { result } = simnet.callPublicFn(
      "vault", "set-paused", [boolCV(true)], wallet1
    );
    expect(result).toBeErr(uintCV(100n));
  });

  it("deposit saat paused: error 103", () => {
    simnet.callPublicFn("vault", "set-paused", [boolCV(true)], deployer);
    const { result } = simnet.callPublicFn(
      "vault", "deposit", [uintCV(1000n)], wallet1
    );
    expect(result).toBeErr(uintCV(104n));
  });
});