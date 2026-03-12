// -------------------------------------------------------
// CARA INTEGRASI DI App.tsx (atau file utama kamu)
// -------------------------------------------------------
//
// 1. Install dependencies:
//    npm install @tanstack/react-query recharts
//
// 2. Setup QueryClient (sekali di root):
// -------------------------------------------------------

"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStrategies } from "../src/hooks/useStrategies";
import YieldSimulator from "./YieldSimulator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
    },
  },
});

// -------------------------------------------------------
// Wrap App di QueryClientProvider (di main.tsx):
//
// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <QueryClientProvider client={queryClient}>
//     <App />
//   </QueryClientProvider>
// )
// -------------------------------------------------------

// -------------------------------------------------------
// Komponen StrategyTable yang sudah pakai live data:
// -------------------------------------------------------

function StrategyTable() {
  const { data: strategies, isLoading, dataUpdatedAt } = useStrategies();

  if (isLoading || !strategies) {
    return <div style={{ textAlign: "center", padding: 32 }}>Loading strategies...</div>;
  }

  return (
    <div>
      {/* Last updated timestamp */}
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textAlign: "right" }}>
        Updated: {new Date(dataUpdatedAt).toLocaleTimeString("id-ID")}
        {" Â· "}
        <span style={{ color: "#4ade80" }}>â— Live</span>
      </div>

      {/* Strategy table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Strategy", "Type", "APY", "24h", "TVL", "Risk"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strategies.map((s) => (
            <tr
              key={s.id}
              style={{
                background: s.isTop ? "rgba(74,222,128,0.04)" : "transparent",
              }}
            >
              <td style={{ padding: "12px", fontWeight: 500, color: "#e2e8f0" }}>
                {s.isTop && <span style={{ color: "#fbbf24", marginRight: 4 }}>â˜…</span>}
                {s.name}
              </td>
              <td style={{ padding: "12px", fontSize: 12, color: "#94a3b8" }}>{s.type}</td>
              <td style={{ padding: "12px", fontWeight: 700, color: "#4ade80" }}>
                {s.apy.toFixed(1)}%
              </td>
              <td style={{ padding: "12px", fontSize: 12 }}>
                <span style={{ color: s.apyChange24h >= 0 ? "#4ade80" : "#f87171" }}>
                  {s.apyChange24h >= 0 ? "+" : ""}{s.apyChange24h.toFixed(1)}pp
                </span>
              </td>
              <td style={{ padding: "12px", fontSize: 12, color: "#94a3b8" }}>
                {/* formatTVL dari hook */}
                {s.tvl >= 1_000_000
                  ? `$${(s.tvl / 1_000_000).toFixed(1)}M`
                  : `$${(s.tvl / 1_000).toFixed(0)}K`}
              </td>
              <td style={{ padding: "12px" }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background:
                      s.risk === "Low"
                        ? "rgba(74,222,128,0.1)"
                        : s.risk === "Medium"
                        ? "rgba(251,191,36,0.1)"
                        : "rgba(248,113,113,0.1)",
                    color:
                      s.risk === "Low"
                        ? "#4ade80"
                        : s.risk === "Medium"
                        ? "#fbbf24"
                        : "#f87171",
                  }}
                >
                  {s.risk}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Simulator langsung di bawah tabel */}
      <YieldSimulator strategies={strategies} />
    </div>
  );
}

export { StrategyTable, queryClient };

// -------------------------------------------------------
// STRUKTUR FILE AKHIRNYA:
//
// src/
// â”œâ”€â”€ hooks/
// â”‚   â””â”€â”€ useStrategies.ts        â† live APY fetcher
// â”œâ”€â”€ components/
// â”‚   â””â”€â”€ YieldSimulator.tsx      â† kalkulator + chart
// â”œâ”€â”€ App.tsx                     â† tambah <StrategyTable />
// â””â”€â”€ main.tsx                    â† wrap QueryClientProvider
//
// PERINTAH INSTALL:
// npm install @tanstack/react-query recharts
// -------------------------------------------------------

