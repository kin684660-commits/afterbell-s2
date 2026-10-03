import { Analysis, type AnalysisType, type Evidence } from "./types";
import { equitySession } from "./calendar";
export function validateAnalysis(
  value: unknown,
  evidence: Evidence[],
): AnalysisType {
  const result = Analysis.parse(value);
  const ids = new Set(evidence.map((e) => e.id));
  for (const c of [
    ...result.impactChain,
    ...result.facts,
    ...result.inferences,
    ...result.counterEvidence,
  ]) {
    for (const id of c.evidenceIds)
      if (!ids.has(id))
        throw new Error("Model cited evidence that was not retrieved");
    if (
      !evidence.some(
        (e) =>
          c.evidenceIds.includes(e.id) &&
          e.text.replace(/\s+/g, " ").includes(c.quote.replace(/\s+/g, " ")),
      )
    )
      throw new Error("Evidence quotation does not occur in a cited source");
  }
  return result;
}
export function freshness(timestamp: string | null, now = Date.now()) {
  if (!timestamp) return "unknown";
  const age = now - Date.parse(timestamp);
  return !Number.isFinite(age) || age < -60000
    ? "invalid"
    : age > 300000
      ? "stale"
      : "fresh";
}
export const marketSession = equitySession;
export function enforceResearchOnly(
  a: AnalysisType,
  language = "en",
): AnalysisType {
  return {
    ...a,
    conclusion: a.conclusion === "insufficient" ? "insufficient" : "wait",
    waitConditions: [
      ...new Set([
        ...a.waitConditions,
        language === "zh"
          ? "原生股可执行报价与可赎回代币映射未验证；实际合约盘口仅为快照，不能据此确认成交或跨市场套利。"
          : "Native executable quote and redeemable-token mapping are unverified; actual perpetual-book snapshots do not guarantee fills or cross-market arbitrage.",
      ]),
    ],
    limitations: [
      ...a.limitations,
      language === "zh"
        ? "公司与政策事实不等于价格预期差；一致预期和当前可执行价格仍须独立核实。"
        : "Company and policy facts do not establish price surprise; expectations and current executable pricing must be independently checked.",
    ],
  };
}
