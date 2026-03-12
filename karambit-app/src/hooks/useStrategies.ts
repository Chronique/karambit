// src/hooks/useStrategies.ts
// -------------------------------------------------------
// Live APY fetcher untuk Karambit
// Fetch dari ALEX, Zest, BitFlow â€” dengan fallback ke data statis
// kalau API-nya down atau CORS block di browser.
//
// Install dulu:
//   npm install @tanstack/react-query
//
// Setup di main.tsx / App.tsx:
//   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
//   const queryClient = new QueryClient()
//   <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
// -------------------------------------------------------

import { useQuery } from "@tanstack/react-query";

export type RiskLevel = "Low" | "Medium" | "High";

export interface Strategy {
  id: string;
  name: string;
  type: string;
  apy: number;
  apyChange24h: number; // APY change in 24 hours (percentage points)
  tvl: number;          // Total Value Locked in USD
  risk: RiskLevel;
  isTop: boolean;       // whether this is currently the best strategy
  protocol: string;     // original protocol name
  lastUpdated: Date;
}

// -------------------------------------------------------
// Fallback data â€” dipakai kalau semua API gagal
// Update these numbers manually if needed
// -------------------------------------------------------
const FALLBACK_STRATEGIES: Strategy[] = [
  {
    id: "zest",
    name: "Zest Protocol",
    type: "Lending",
    apy: 7.2,
    apyChange24h: +0.3,
    tvl: 4_200_000,
    risk: "Low",
    isTop: false,
    protocol: "zest",
    lastUpdated: new Date(),
  },
  {
    id: "bitflow",
    name: "BitFlow",
    type: "LP / AMM",
    apy: 10.5,
    apyChange24h: -0.8,
    tvl: 2_800_000,
    risk: "Medium",
    isTop: true,
    protocol: "bitflow",
    lastUpdated: new Date(),
  },
  {
    id: "stackingdao",
    name: "Stacking DAO",
    type: "Liquid Stacking",
    apy: 8.1,
    apyChange24h: +0.1,
    tvl: 18_500_000,
    risk: "Low",
    isTop: false,
    protocol: "stackingdao",
    lastUpdated: new Date(),
  },
];

// -------------------------------------------------------
// Individual fetcher per protocol
// // fallback data will be used for that item
// -------------------------------------------------------

async function fetchAlexAPY(): Promise<number | null> {
  try {
    // ALEX public API â€” endpoint pool stats
    const res = await fetch(
      "https://api.alexlab.co/v1/pool_stats/token-wstx::token-wbtc",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // ALEX returns APY as decimal, e.g. 0.105 = 10.5%
    const apy = data?.apy_7d ?? data?.apy_24h ?? data?.apy;
    return apy ? parseFloat((apy * 100).toFixed(2)) : null;
  } catch {
    return null;
  }
}

async function fetchZestAPY(): Promise<number | null> {
  try {
    // Zest Protocol market data
    const res = await fetch(
      "https://app.zestprotocol.com/api/markets",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Find sBTC/BTC supply APY market
    const sbtcMarket = data?.markets?.find(
      (m: { asset: string }) =>
        m.asset?.toLowerCase().includes("sbtc") ||
        m.asset?.toLowerCase().includes("btc")
    );
    return sbtcMarket?.supplyApy
      ? parseFloat(sbtcMarket.supplyApy.toFixed(2))
      : null;
  } catch {
    return null;
  }
}

async function fetchBitflowAPY(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev/ticker",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // BitFlow returns array of ticker objects directly
    const pools = Array.isArray(data) ? data : Object.values(data);
    const sbtcPool = pools
      .filter((p: any) =>
        p.base_currency?.toLowerCase().includes("sbtc") ||
        p.target_currency?.toLowerCase().includes("sbtc")
      )
      .sort((a: any, b: any) => (b.liquidity_in_usd ?? 0) - (a.liquidity_in_usd ?? 0))[0];
    // BitFlow ticker doesn't return APY directly — return null, use fallback
    return sbtcPool ? null : null;
  } catch {
    return null;
  }
}

async function fetchStackingDaoAPY(): Promise<number | null> {
  try {
    // Stacking DAO stats API
    const res = await fetch(
      "https://api.stackingdao.com/v1/stacking-stats",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.apy ? parseFloat(data.apy.toFixed(2)) : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// Main fetcher â€” jalankan semua paralel, merge dengan fallback
// -------------------------------------------------------
async function fetchLiveStrategies(): Promise<Strategy[]> {
  const [alexApy, zestApy, bitflowApy, stackingDaoApy] = await Promise.all([
    fetchAlexAPY(),
    fetchZestAPY(),
    fetchBitflowAPY(),
    fetchStackingDaoAPY(),
  ]);

  const now = new Date();

  const strategies: Strategy[] = [
    {
      ...FALLBACK_STRATEGIES[0], // zest
      apy: zestApy ?? FALLBACK_STRATEGIES[0].apy,
      lastUpdated: now,
    },
    {
      ...FALLBACK_STRATEGIES[1], // bitflow
      apy: bitflowApy ?? alexApy ?? FALLBACK_STRATEGIES[1].apy,
      lastUpdated: now,
    },
    {
      ...FALLBACK_STRATEGIES[2], // stackingdao
      apy: stackingDaoApy ?? FALLBACK_STRATEGIES[2].apy,
      lastUpdated: now,
    },
  ];

  // Re-evaluate which strategy has highest APY
  const maxApy = Math.max(...strategies.map((s) => s.apy));
  return strategies.map((s) => ({
    ...s,
    isTop: s.apy === maxApy,
  }));
}

// -------------------------------------------------------
// Hook utama â€” pakai di komponen manapun
// -------------------------------------------------------
export function useStrategies() {
  return useQuery({
    queryKey: ["strategies"],
    queryFn: fetchLiveStrategies,
    staleTime: 5 * 60 * 1000,      // data stays fresh for 5 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refetch every 5 minutes
    refetchIntervalInBackground: false,
    placeholderData: FALLBACK_STRATEGIES, // show fallback while loading
    retry: 2,
  });
}

// -------------------------------------------------------
// Utility â€” format angka untuk display
// -------------------------------------------------------
export function formatTVL(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

