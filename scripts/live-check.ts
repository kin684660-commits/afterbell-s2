import { mkdirSync, writeFileSync } from "node:fs";
import { research } from "../lib/research";
const symbols = (process.env.AFTERBELL_LIVE_SYMBOLS || "NVDA").split(",") as (
  "AAPL" | "MSFT" | "NVDA"
)[];
async function main() {
  const rows = [];
  for (const symbol of symbols) {
    const run = await research(
      {
        question: `请研究 ${symbol} 最新可获取的官方事件，区分业务影响和市场已定价的可能性，列出需要等待的资料与可证伪条件。`,
        symbol,
        mode: "live",
        useModel: true,
        language: "zh",
        horizon: "next-session",
        riskPreference: "balanced",
      },
      (r) =>
        console.log(
          JSON.stringify({
            id: r.id,
            stage: r.stages?.at(-1),
            evidence: r.evidence.length,
          }),
        ),
    );
    mkdirSync("data/reports", { recursive: true });
    writeFileSync(
      `data/reports/live-${symbol}.json`,
      JSON.stringify(run, null, 2),
    );
    rows.push({
      symbol,
      id: run.id,
      status: run.status,
      engine: run.engine,
      evidence: run.evidence.length,
      tools: run.tools?.map((t) => ({
        label: t.label,
        status: t.status,
        error: t.error,
      })),
      errors: run.errors,
      usage: run.usage,
    });
  }
  console.log(JSON.stringify(rows, null, 2));
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
