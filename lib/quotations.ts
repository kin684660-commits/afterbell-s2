import type { Evidence } from "./types";
export function quoteBank(evidence: Evidence[]) {
  return evidence.flatMap((e) => {
    const normalized = e.text.replace(/\s+/g, " ").trim();
    if (e.id.startsWith("fund-")) {
      return e.text
        .split("\n")
        .filter((x) => x.length >= 8)
        .map((line, i) => ({
          quoteId: `${e.id}:q${i + 1}`,
          evidenceId: e.id,
          text: line.replace(/\s+/g, " ").trim(),
        }));
    }
    const chunks: string[] = [];
    let offset = 0;
    while (offset < normalized.length && chunks.length < 80) {
      let end = Math.min(offset + 480, normalized.length);
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf(" ", end);
        if (boundary > offset + 200) end = boundary;
      }
      const text = normalized.slice(offset, end).trim();
      if (text.length >= 8) chunks.push(text);
      offset = end + 1;
    }
    return chunks.map((text, i) => ({
      quoteId: `${e.id}:q${i + 1}`,
      evidenceId: e.id,
      text,
    }));
  });
}
export function bindQuotes(value: unknown, evidence: Evidence[]): unknown {
  if (!value || typeof value !== "object") return value;
  const result = value as Record<string, unknown>;
  const bank = quoteBank(evidence);
  const lookup = new Map(bank.map((q) => [q.quoteId, q]));
  for (const key of ["facts", "inferences", "counterEvidence", "impactChain"]) {
    if (!Array.isArray(result[key])) continue;
    result[key] = (result[key] as Record<string, unknown>[]).map((c) => {
      if (!c.quoteId) return c;
      const q = lookup.get(String(c.quoteId));
      if (!q) throw Error("Model selected an unknown evidence quotation");
      if (
        Array.isArray(c.evidenceIds) &&
        c.evidenceIds.length &&
        !c.evidenceIds.includes(q.evidenceId)
      )
        throw Error("Quotation source does not match citation");
      return { ...c, evidenceIds: [q.evidenceId], quote: q.text };
    });
  }
  return result;
}
