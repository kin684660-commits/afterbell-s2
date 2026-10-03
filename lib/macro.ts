import { load } from "cheerio";
import { hash } from "./sources";
import type { Evidence, ToolTrace } from "./types";
export function parseTreasury(xml: string, now = new Date()) {
  const $ = load(xml, { xmlMode: true });
  const rows: { date: string; rates: Record<string, number> }[] = [];
  $("entry").each((_, entry) => {
    const date = $(entry).find("d\\:NEW_DATE").text().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date > now.toISOString().slice(0, 10)
    )
      return;
    const rates: Record<string, number> = {};
    for (const [tag, name] of [
      ["BC_3MONTH", "3M"],
      ["BC_2YEAR", "2Y"],
      ["BC_10YEAR", "10Y"],
      ["BC_30YEAR", "30Y"],
    ]) {
      const text = $(entry).find(`d\\:${tag}`).text();
      const value = Number(text);
      if (text.trim() && Number.isFinite(value) && value >= 0 && value < 30)
        rates[name] = value;
    }
    if (Object.keys(rates).length >= 3) rows.push({ date, rates });
  });
  rows.sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) throw Error("No usable Treasury yield observations");
  if (
    Date.parse(now.toISOString().slice(0, 10)) - Date.parse(rows[0].date) >
    10 * 86400000
  )
    throw Error("Treasury observation older than 10 days");
  return {
    provider: "US Treasury",
    unit: "percent per annum",
    observedDate: rows[0].date,
    rates: rows[0].rates,
    previous: rows[1] || null,
  };
}
export async function macroContext() {
  const now = new Date(),
    startedAt = now.toISOString();
  let url = "";
  const trace: ToolTrace = {
    tool: "treasury-yield-curve",
    label: "美国财政部日收益率",
    skill: "Official Treasury public feed fallback",
    endpoint: "",
    arguments: {},
    startedAt,
    durationMs: 0,
    status: "failed",
    error: null,
    evidenceId: null,
  };
  try {
    let data: ReturnType<typeof parseTreasury> | null = null;
    for (let month = 0; month < 2 && !data; month++) {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - month, 1),
      );
      const ym = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${ym}`;
      trace.endpoint = url;
      const r = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        redirect: "error",
        headers: { Accept: "application/xml" },
      });
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      const xml = await r.text();
      try {
        data = parseTreasury(xml, now);
      } catch (e) {
        if (month === 1) throw e;
      }
    }
    if (!data) throw Error("No Treasury observations");
    const text = JSON.stringify(data);
    const id = "macro-treasury";
    const evidence: Evidence = {
      id,
      url,
      title: trace.label,
      text,
      publishedAt: null,
      retrievedAt: startedAt,
      hash: hash(text),
      kind: "official",
      warnings: [
        "Daily par yield estimates, not live executable bond prices or the Federal Reserve policy rate. Observation date differs from retrieval time; no causal attribution to company news.",
      ],
    };
    trace.status = "success";
    trace.evidenceId = id;
    trace.durationMs = Date.now() - now.getTime();
    return { data, evidence: [evidence], trace };
  } catch (e) {
    trace.error = e instanceof Error ? e.message : "Unavailable";
    trace.durationMs = Date.now() - now.getTime();
    return { data: null, evidence: [], trace };
  }
}
