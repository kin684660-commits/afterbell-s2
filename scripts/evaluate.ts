import { mkdirSync, writeFileSync } from "node:fs";
import { cases } from "../lib/cases";
import { research } from "../lib/research";
async function main() {
  const rows = [];
  for (const c of cases) {
    const r = await research({
      question: "What is confirmed and what prevents a trade conclusion?",
      symbol: c.symbol,
      caseId: c.id,
      mode: "case",
      language: "en",
      useModel: false,
    });
    rows.push({
      caseId: c.id,
      synthetic: c.synthetic,
      engine: r.engine,
      status: r.status,
      validSourceIds: r.analysis?.facts.every((f) =>
        f.evidenceIds.every((id) => r.evidence.some((e) => e.id === id)),
      ),
      abstained: r.analysis?.conclusion === "insufficient",
      durationMs: r.durationMs,
    });
  }
  mkdirSync("data/reports", { recursive: true });
  writeFileSync(
    "data/reports/replay-evaluation.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        kind: "deterministic replay plumbing check",
        limitations:
          "Not an LLM comparison, correctness study, injection test or real-user study",
        rows,
      },
      null,
      2,
    ),
  );
  console.log(
    `${rows.length} replay flows checked; no model performance claimed.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
