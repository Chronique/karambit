#  Karambit  sBTC Yield Aggregator

> First sBTC yield aggregator on Stacks Bitcoin L2. Automatically routes your sBTC to the highest-yielding DeFi strategy.

[![Audit Score](https://img.shields.io/badge/Security%20Audit-92%2F100%20EXCELLENT-brightgreen)](https://github.com/Chronique/stacks-clarity-audit)
[![Tests](https://img.shields.io/badge/Tests-28%20Passing-brightgreen)]()
[![Network](https://img.shields.io/badge/Network-Stacks%20Testnet-orange)]()

## What is Karambit?

Karambit is the first yield aggregator for sBTC on the Stacks Bitcoin L2. It automatically routes user deposits to whichever protocol currently offers the highest APY  no manual rebalancing needed.

| Strategy | Type | APY |
|---|---|---|
|  BitFlow | LP / AMM | 10% |
| Stacking DAO | Liquid Stacking | 8% |
| Zest Protocol | Lending | 7% |

## Architecture
`
User deposits sBTC
      
      
  vault.clar           Manages shares, deposit/withdraw
      
      
strategy-router.clar   Selects highest APY strategy
      
   
                             
strategy-zest  strategy-bitflow  strategy-stackingdao
`

## Smart Contracts

| Contract | Description |
|---|---|
| vault.clar | Main vault  handles shares, deposit, withdraw |
| strategy-router.clar | Auto-routing to best APY strategy |
| strategy-zest.clar | Zest Protocol lending integration |
| strategy-bitflow.clar | BitFlow LP/AMM integration |
| strategy-stackingdao.clar | Stacking DAO liquid stacking integration |
| strategy-trait.clar | Shared interface for all strategies |

## Security

Audited with [stacks-clarity-audit](https://github.com/Chronique/stacks-clarity-audit):

- **Score: 92/100 EXCELLENT**
- 0 critical issues
- 5 warnings (CLA-007: var-set auth  all protected by CONTRACT-OWNER check)

## Testnet Deployment

Deployer: ST3CM1955QMJ712DDV0C0F0KE205XQT4CRZ3R3N2

View on explorer: https://explorer.hiro.so/address/ST3CM1955QMJ712DDV0C0F0KE205XQT4CRZ3R3N2?chain=testnet

## Getting Started

### Run Tests
`powershell
cd karambit
npm test
# 28/28 passing
`

### Run Frontend
`powershell
cd karambit/karambit-app
npm install
npm run dev
# Open http://localhost:3000
`

### Deploy to Testnet
`powershell
cd karambit
clarinet deployments generate --testnet --low-cost
clarinet deployments apply --testnet
`

## Tech Stack

- **Smart Contracts:** Clarity (Stacks L2)
- **Testing:** Clarinet + Vitest
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Wallet:** Leather / Xverse
- **Network:** Stacks Testnet (Bitcoin L2)

## Built For

BUIDL BATTLE #2  DoraHacks Stacks Hackathon 2026

---

*Named after the Minangkabau karambit blade  precise, efficient, and built to last.*
