// lib/contracts.ts
import { STACKS_TESTNET } from "@stacks/network";

export const NETWORK = STACKS_TESTNET;

export const DEPLOYER = "ST3CM1955QMJ712DDV0C0F0KE205XQT4CRZ3R3N2";

export const CONTRACTS = {
  vault: { address: DEPLOYER, name: "vault" },
  strategyRouter: { address: DEPLOYER, name: "strategy-router" },
  strategyZest: { address: DEPLOYER, name: "strategy-zest" },
  strategyBitflow: { address: DEPLOYER, name: "strategy-bitflow" },
  strategyStackingDao: { address: DEPLOYER, name: "strategy-stackingdao" },
};