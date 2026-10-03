import { fundamentalContext } from "../lib/fundamentals";
import { mkdirSync, writeFileSync } from "node:fs";
async function main() {
  const all = await Promise.all(
    (["AAPL", "MSFT", "NVDA"] as const).map(async (symbol) => {
      const r = await fundamentalContext(symbol);
      mkdirSync("data/reports", { recursive: true });
      writeFileSync(
        `data/reports/fundamentals-${symbol}.json`,
        JSON.stringify(r, null, 2),
      );
      return {
        symbol,
        financials: r.bundle.financials.length,
        consensus: r.bundle.consensus.length,
        asOf: r.bundle.consensusAsOf,
        traces: r.traces.map((t) => ({
          tool: t.tool,
          status: t.status,
          error: t.error,
        })),
        recentRevenue: r.bundle.financials.find(
          (x) => x.metric === "revenue" && x.period === "quarter",
        ),
      };
    }),
  );
  console.log(JSON.stringify(all, null, 2));
  if (all.some((x) => x.financials === 0 || x.consensus === 0))
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
