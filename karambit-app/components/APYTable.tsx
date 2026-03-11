"use client";

const strategies = [
  { name: "Zest Protocol", type: "Lending", apy: 7.0, risk: "Low", status: "Active" },
  { name: "BitFlow", type: "LP / AMM", apy: 10.0, risk: "Medium", status: "Active" },
  { name: "Stacking DAO", type: "Liquid Stacking", apy: 8.0, risk: "Low", status: "Active" },
];

const best = strategies.reduce((a, b) => a.apy > b.apy ? a : b);

export default function APYTable() {
  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Strategy APY</h2>
        <span className="text-sm text-gray-400">
          Auto-routing to <span className="text-orange-400 font-bold">{best.name}</span>
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-gray-400 text-sm border-b border-gray-800">
            <th className="text-left pb-3">Strategy</th>
            <th className="text-left pb-3">Type</th>
            <th className="text-right pb-3">APY</th>
            <th className="text-right pb-3">Risk</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((s) => (
            <tr
              key={s.name}
              className={`border-b border-gray-800 ${
                s.name === best.name ? "bg-orange-500/10" : ""
              }`}
            >
              <td className="py-4 font-medium">
                {s.name === best.name && (
                  <span className="text-orange-400 mr-2">★</span>
                )}
                {s.name}
              </td>
              <td className="py-4 text-gray-400 text-sm">{s.type}</td>
              <td className="py-4 text-right">
                <span className="text-green-400 font-bold">{s.apy}%</span>
              </td>
              <td className="py-4 text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  s.risk === "Low"
                    ? "bg-green-900 text-green-300"
                    : "bg-yellow-900 text-yellow-300"
                }`}>
                  {s.risk}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}