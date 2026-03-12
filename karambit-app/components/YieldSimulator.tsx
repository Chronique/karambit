// src/components/YieldSimulator.tsx
// -------------------------------------------------------
// Yield Simulator untuk Karambit
// Hitung estimasi keuntungan tanpa perlu connect wallet.
// Pakai recharts untuk grafik proyeksi.
//
// Install dulu:
//   npm install recharts
//
// Cara pakai di App.tsx:
//   import YieldSimulator from './components/YieldSimulator'
//   <YieldSimulator strategies={strategies} />
// -------------------------------------------------------

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Strategy } from "../src/hooks/useStrategies";
import { formatTVL } from "../src/hooks/useStrategies";

interface Props {
  strategies: Strategy[];
}

// Hitung proyeksi compound yield per months
function buildProjection(
  principal: number,
  apy: number,
  months: number
): { month: string; value: number; yield: number }[] {
  return Array.from({ length: months + 1 }, (_, i) => {
    const value = principal * Math.pow(1 + apy / 100 / 12, i);
    return {
      month: i === 0 ? "Now" : `${i}M`,
      value: parseFloat(value.toFixed(4)),
      yield: parseFloat((value - principal).toFixed(4)),
    };
  });
}

const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.5, 1];
const PERIOD_OPTIONS = [3, 6, 12, 24];

// Custom tooltip untuk chart
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-tooltip, #1a1a2e)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#a0a0b0", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#e2e8f0", fontWeight: 500 }}>
        {payload[0].value.toFixed(6)} sBTC
      </div>
      {payload[1] && (
        <div style={{ color: "#4ade80", fontSize: 11 }}>
          +{payload[1].value.toFixed(6)} yield
        </div>
      )}
    </div>
  );
};

export default function YieldSimulator({ strategies }: Props) {
  const [amount, setAmount] = useState<string>("0.1");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(
    strategies.find((s) => s.isTop)?.id ?? strategies[0]?.id ?? "bitflow"
  );
  const [months, setMonths] = useState<number>(12);
  const [compareMode, setCompareMode] = useState<boolean>(false);

  const principal = parseFloat(amount) || 0;
  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);
  const apy = selectedStrategy?.apy ?? 0;

  // Proyeksi untuk STRATEGY terpilih
  const projection = useMemo(
    () => buildProjection(principal, apy, months),
    [principal, apy, months]
  );

  // Proyeksi semua STRATEGY untuk compare mode
  const allProjections = useMemo(() => {
    if (!compareMode || principal <= 0) return null;
    return strategies.map((s) => ({
      ...s,
      finalValue: principal * Math.pow(1 + s.apy / 100 / 12, months),
      totalYield:
        principal * Math.pow(1 + s.apy / 100 / 12, months) - principal,
    }));
  }, [compareMode, strategies, principal, months]);

  const finalValue = projection[projection.length - 1]?.value ?? 0;
  const totalYield = finalValue - principal;
  const totalYieldPct = principal > 0 ? (totalYield / principal) * 100 : 0;

  // Format sBTC dengan 6 desimal
  const fmt = (n: number) =>
    n > 0 ? `${n.toFixed(6)} sBTC` : "0.000000 sBTC";

  return (
    <div
      style={{
        background: "var(--bg-card, rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "24px",
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text, #e2e8f0)",
            }}
          >
            Yield Simulator
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--color-muted, #64748b)",
            }}
          >
            Estimasi yield tanpa perlu connect wallet
          </p>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          style={{
            background: compareMode
              ? "rgba(99,102,241,0.2)"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${compareMode ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: compareMode ? "#818cf8" : "var(--color-muted, #94a3b8)",
            cursor: "pointer",
          }}
        >
          {compareMode ? "✓ Compare mode" : "Compare all"}
        </button>
      </div>

      {/* Input Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Amount input */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-muted, #64748b)",
              display: "block",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            AMOUNT (sBTC)
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 48px 10px 12px",
                fontSize: 15,
                color: "var(--color-text, #e2e8f0)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                color: "var(--color-muted, #64748b)",
              }}
            >
              sBTC
            </span>
          </div>
          {/* Quick presets */}
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                style={{
                  flex: 1,
                  background:
                    parseFloat(amount) === p
                      ? "rgba(99,102,241,0.2)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${parseFloat(amount) === p ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 6,
                  padding: "3px 0",
                  fontSize: 11,
                  color:
                    parseFloat(amount) === p
                      ? "#818cf8"
                      : "var(--color-muted, #64748b)",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy select */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-muted, #64748b)",
              display: "block",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            STRATEGY
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStrategyId(s.id);
                  setCompareMode(false);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background:
                    selectedStrategyId === s.id && !compareMode
                      ? "rgba(99,102,241,0.15)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedStrategyId === s.id && !compareMode ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text, #e2e8f0)",
                    }}
                  >
                    {s.isTop && "★ "}
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--color-muted, #64748b)",
                      marginLeft: 6,
                    }}
                  >
                    {s.type}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: s.isTop ? "#4ade80" : "#a3e635",
                  }}
                >
                  {s.apy.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--color-muted, #64748b)",
            display: "block",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          PERIOD
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIOD_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              style={{
                flex: 1,
                background:
                  months === m
                    ? "rgba(99,102,241,0.2)"
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${months === m ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                padding: "7px 0",
                fontSize: 12,
                color:
                  months === m ? "#818cf8" : "var(--color-muted, #94a3b8)",
                cursor: "pointer",
                fontWeight: months === m ? 600 : 400,
              }}
            >
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {!compareMode && principal > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "INITIAL AMOUNT",
              value: fmt(principal),
              color: "#94a3b8",
            },
            {
              label: `YIELD IN ${months}M`,
              value: fmt(totalYield),
              color: "#4ade80",
            },
            {
              label: "FINAL TOTAL",
              value: fmt(finalValue),
              color: "#818cf8",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-muted, #64748b)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: card.color,
                  wordBreak: "break-all",
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total return badge */}
      {!compareMode && principal > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
            padding: "8px 16px",
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Total return in {months} months:
          </span>
          <span
            style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}
          >
            +{totalYieldPct.toFixed(2)}%
          </span>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            ({selectedStrategy?.name} @ {apy}% APY)
          </span>
        </div>
      )}

      {/* Chart area — single strategy */}
      {!compareMode && principal > 0 && (
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradYield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={60}
                tickFormatter={(v) => v.toFixed(4)}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={principal}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradValue)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="yield"
                stroke="#4ade80"
                strokeWidth={1.5}
                fill="url(#gradYield)"
                dot={false}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Compare mode — bar chart sederhana */}
      {compareMode && principal > 0 && allProjections && (
        <div>
          {allProjections
            .sort((a, b) => b.totalYield - a.totalYield)
            .map((s, i) => {
              const maxYield = allProjections[0].totalYield || 1;
              const barWidth = (s.totalYield / maxYield) * 100;
              return (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text, #e2e8f0)",
                      }}
                    >
                      {i === 0 && "★ "}
                      {s.name}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          marginLeft: 6,
                        }}
                      >
                        {s.apy.toFixed(1)}% APY
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: i === 0 ? "#4ade80" : "#94a3b8",
                      }}
                    >
                      +{s.totalYield.toFixed(6)} sBTC
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidth}%`,
                        background:
                          i === 0
                            ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                            : "rgba(99,102,241,0.5)",
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#475569",
                      marginTop: 3,
                    }}
                  >
                    TVL: {formatTVL(s.tvl)} · Risk: {s.risk} · Final:{" "}
                    {s.finalValue.toFixed(6)} sBTC
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Empty state */}
      {principal <= 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            color: "var(--color-muted, #475569)",
            fontSize: 14,
          }}
        >
          Masukkan AMOUNT (sBTC) untuk melihat proyeksi yield
        </div>
      )}

      {/* Disclaimer */}
      <p
        style={{
          margin: "16px 0 0",
          fontSize: 10,
          color: "#334155",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Estimasi berdasarkan APY saat ini dan compound monthsan. APY dapat
        berubah. Bukan financial advice.
      </p>
    </div>
  );
}

