import type { Run } from "./types";
export function markdown(r: Run) {
  const lines = [
    `# Afterbell — ${r.input.symbol}`,
    "",
    `Question: ${r.input.question}`,
    "",
    `Mode: ${r.input.mode} · Engine: ${r.engine} · Created: ${r.createdAt}`,
    `Horizon: ${r.input.horizon || "next-session"} · Risk preference: ${r.input.riskPreference || "balanced"}`,
    "",
    "## Summary",
    r.analysis?.summary || "Analysis unavailable",
    "",
  ];
  if (r.native)
    lines.push(
      "## Native US equity snapshot",
      `${r.native.symbol} · ${r.native.exchange} · ${r.native.price} USD`,
      `Observed: ${r.native.observedAt} · Retrieved: ${r.native.retrievedAt} · Delay: unverified`,
      ...r.native.warnings,
      "",
    );
  if (r.venue)
    lines.push(
      "## Bitget stock perpetual snapshot",
      `${r.venue.symbol} · Last ${r.venue.last} ${r.venue.quoteCurrency} · Bid ${r.venue.bid} / Ask ${r.venue.ask} · Spread ${r.venue.spreadBps.toFixed(2)} bps`,
      `Observed: ${r.venue.observedAt} · Book: ${r.venue.bookObservedAt || "unknown"}`,
      ...r.venue.warnings,
      "",
    );
  if (r.fundamentals)
    lines.push(
      "## Reported financials and consensus",
      JSON.stringify(r.fundamentals, null, 2),
      "",
    );
  if (r.analysis?.citationReview)
    lines.push(
      "## Quotation semantic review",
      JSON.stringify(r.analysis.citationReview, null, 2),
      "Same-model review, not independent fact checking.",
      "",
    );
  if (r.macro)
    lines.push(
      "## US Treasury daily par yields",
      JSON.stringify(r.macro, null, 2),
      "Daily observations, not live executable bond prices or the Fed policy rate.",
      "",
    );
  lines.push("## Reasoning chain");
  for (const c of r.analysis?.impactChain || [])
    lines.push(
      `- Event: ${c.text}`,
      `  Business: ${c.businessEffect}`,
      `  Asset inference: ${c.assetEffect}`,
      `  Uncertainty: ${c.uncertainty}`,
      `  Test: ${c.test}`,
      `  Evidence: ${c.evidenceIds.join(", ")}`,
      `  > ${c.quote}`,
      "",
    );
  for (const [key, title] of [
    ["facts", "Facts"],
    ["inferences", "Inferences"],
    ["counterEvidence", "Counter-evidence"],
  ] as const) {
    lines.push(`## ${title}`);
    for (const c of r.analysis?.[key] || [])
      lines.push(`- ${c.text} [${c.evidenceIds.join(", ")}]`, `  > ${c.quote}`);
    lines.push("");
  }
  if (r.analysis)
    lines.push(
      "## Bull / bear hypotheses",
      r.analysis.bullCase,
      r.analysis.bearCase,
      "",
      "## Next research question",
      r.analysis.decisionQuestion,
      "",
    );
  for (const [key, title] of [
    ["waitConditions", "Wait conditions"],
    ["invalidationConditions", "Invalidation conditions"],
    ["watchIndicators", "Watch indicators"],
    ["limitations", "Limitations"],
  ] as const)
    lines.push(
      `## ${title}`,
      ...(r.analysis?.[key] || []).map((x) => `- ${x}`),
      "",
    );
  lines.push(
    "## Actual tool calls",
    ...(r.tools || []).map(
      (t) =>
        `- ${t.label} · ${t.status} · ${t.durationMs}ms · ${t.tool} · ${t.error || t.evidenceId || ""}`,
    ),
    "",
    "## Evidence",
  );
  for (const e of r.evidence)
    lines.push(
      `- [${e.title}](${e.url}) · ${e.id} · ${e.kind}`,
      `  Published/observed: ${e.publishedAt || "unknown"} · Retrieved: ${e.retrievedAt} · SHA256: ${e.hash}`,
      `  ${e.warnings.join(" ")}`,
      "",
    );
  lines.push(
    "## Errors",
    ...r.errors,
    "",
    "Research only. No order execution.",
  );
  return lines.join("\n");
}
