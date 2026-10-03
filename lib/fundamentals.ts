import { hash } from "./sources";
import type {
  Evidence,
  ToolTrace,
  FinancialFact,
  FundamentalBundle,
  ConsensusRow,
} from "./types";
const issuers: Record<string, string> = {
  AAPL: "0000320193",
  MSFT: "0000789019",
  NVDA: "0001045810",
};
const cache = new Map<string, { at: number; value: unknown }>();
async function getJson(url: string, sec = false): Promise<any> {
  const old = cache.get(url);
  if (old && Date.now() - old.at < 3600000) return old.value;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    redirect: "error",
    headers: {
      "User-Agent": sec
        ? process.env.AFTERBELL_SEC_USER_AGENT ||
          "Afterbell/0.3 research application"
        : "Afterbell/0.3 research application",
      Accept: "application/json",
    },
  });
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  const value = await r.json();
  cache.set(url, { at: Date.now(), value });
  return value;
}
export function parseSec(
  raw: any,
  symbol: string,
  now = new Date(),
): FinancialFact[] {
  const cik = issuers[symbol];
  if (!cik || Number(raw.cik) !== Number(cik))
    throw Error("SEC issuer identity mismatch");
  const metrics: [string, string[], string, boolean][] = [
    [
      "revenue",
      [
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "SalesRevenueNet",
      ],
      "USD",
      false,
    ],
    ["netIncome", ["NetIncomeLoss"], "USD", false],
    ["dilutedEPS", ["EarningsPerShareDiluted"], "USD/shares", false],
    ["assets", ["Assets"], "USD", true],
    ["equity", ["StockholdersEquity"], "USD", true],
  ];
  const today = now.toISOString().slice(0, 10);
  const output: FinancialFact[] = [];
  for (const [metric, tags, unit, instant] of metrics) {
    const rows: FinancialFact[] = [];
    for (const tag of tags)
      for (const f of raw.facts?.["us-gaap"]?.[tag]?.units?.[unit] || []) {
        if (
          !["10-K", "10-Q"].includes(f.form) ||
          !Number.isFinite(f.val) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(f.end || "") ||
          !/^\d{4}-\d{2}-\d{2}$/.test(f.filed || "") ||
          f.filed > today ||
          f.end > today ||
          !/^\d{10}-\d{2}-\d{6}$/.test(f.accn || "")
        )
          continue;
        const days = (Date.parse(f.end) - Date.parse(f.start)) / 86400000 + 1;
        const period = instant
          ? "instant"
          : days >= 70 && days <= 110
            ? "quarter"
            : days >= 330 && days <= 380
              ? "annual"
              : null;
        if (!period || (instant && f.start)) continue;
        rows.push({
          metric,
          tag,
          unit,
          value: f.val,
          start: f.start || null,
          end: f.end,
          filed: f.filed,
          accession: f.accn,
          form: f.form,
          period,
          filingUrl: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accn.replaceAll("-", "")}/`,
        });
      }
    rows.sort(
      (a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed),
    );
    const distinct = rows.filter(
      (f, i) =>
        rows.findIndex(
          (r) =>
            r.end === f.end && r.start === f.start && r.period === f.period,
        ) === i,
    );
    output.push(
      ...distinct.filter((f) => f.period === "quarter").slice(0, 2),
      ...distinct.filter((f) => f.period === "annual").slice(0, 1),
      ...distinct.filter((f) => f.period === "instant").slice(0, 1),
    );
  }
  if (!output.some((f) => f.metric === "revenue" && f.period === "quarter"))
    throw Error("No usable quarterly financial facts");
  return output;
}
export function parseConsensus(
  raw: any,
  symbol: string,
): { rows: ConsensusRow[]; asOf: string | null } {
  if (raw?.status?.rCode !== 200 || raw?.data?.symbol?.toUpperCase() !== symbol)
    throw Error("Consensus response or issuer mismatch");
  const rows: ConsensusRow[] = [];
  for (const [key, period] of [
    ["quarterlyForecast", "quarter"],
    ["yearlyForecast", "annual"],
  ] as const) {
    for (const r of raw.data[key]?.rows || []) {
      if (
        !/^[A-Z][a-z]{2} \d{4}$/.test(r.fiscalEnd || "") ||
        !Number.isFinite(r.consensusEPSForecast) ||
        !Number.isInteger(r.noOfEstimates) ||
        r.noOfEstimates < 1
      )
        continue;
      const high = Number.isFinite(r.highEPSForecast)
        ? r.highEPSForecast
        : null;
      const low = Number.isFinite(r.lowEPSForecast) ? r.lowEPSForecast : null;
      if (
        (high !== null && high < r.consensusEPSForecast) ||
        (low !== null && low > r.consensusEPSForecast)
      )
        continue;
      rows.push({
        fiscalEnd: r.fiscalEnd,
        period,
        eps: r.consensusEPSForecast,
        high,
        low,
        analysts: r.noOfEstimates,
      });
    }
  }
  if (!rows.length) throw Error("Consensus data empty or invalid");
  const dates = [
    raw.data.quarterlyForecast?.asOf,
    raw.data.yearlyForecast?.asOf,
  ].filter((x) => typeof x === "string" && !Number.isNaN(Date.parse(x)));
  return {
    rows: rows
      .filter((r) => r.period === "quarter")
      .slice(0, 4)
      .concat(rows.filter((r) => r.period === "annual").slice(0, 2)),
    asOf: dates[0] || null,
  };
}
export async function fundamentalContext(symbol: string) {
  if (!issuers[symbol]) throw Error("Unsupported issuer");
  const retrievedAt = new Date().toISOString();
  const bundle: FundamentalBundle = {
    symbol,
    retrievedAt,
    companyName: null,
    industry: null,
    sector: null,
    financials: [],
    consensus: [],
    consensusAsOf: null,
    warnings: [
      "SEC facts are GAAP historical disclosures, not a real-time earnings release. Fiscal periods use start/end dates; filing fiscal-year metadata is not assumed to be the period year.",
      "Nasdaq consensus is a provider forecast snapshot. Estimate-update time and accounting basis are unverified; never compare GAAP EPS with these estimates to claim beat/miss. No revenue consensus was retrieved.",
      "These public endpoints have no verified production SLA or redistribution license. Successful responses are cached for one hour; retrievedAt is application retrieval time, not provider update time.",
    ],
  };
  const evidence: Evidence[] = [],
    traces: ToolTrace[] = [];
  const plans = [
    {
      name: "sec-companyfacts",
      label: "SEC 已披露财务数据",
      url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${issuers[symbol]}.json`,
      parse: (r: any) => {
        bundle.financials = parseSec(r, symbol);
        return {
          symbol,
          entity: r.entityName,
          basis: "US GAAP",
          financials: bundle.financials,
        };
      },
    },
    {
      name: "nasdaq-profile",
      label: "Nasdaq 公司与行业资料",
      url: `https://api.nasdaq.com/api/company/${symbol}/company-profile`,
      parse: (r: any) => {
        if (r?.status?.rCode !== 200 || r?.data?.Symbol?.value !== symbol)
          throw Error("Company identity mismatch");
        bundle.companyName = r.data.CompanyName?.value || null;
        bundle.industry = r.data.Industry?.value || null;
        bundle.sector = r.data.Sector?.value || null;
        return {
          symbol,
          companyName: bundle.companyName,
          industry: bundle.industry,
          sector: bundle.sector,
        };
      },
    },
    {
      name: "nasdaq-consensus",
      label: "Nasdaq 盈利一致预期",
      url: `https://api.nasdaq.com/api/analyst/${symbol}/earnings-forecast`,
      parse: (r: any) => {
        const c = parseConsensus(r, symbol);
        bundle.consensus = c.rows;
        bundle.consensusAsOf = c.asOf;
        return {
          symbol,
          estimateUpdatedAt: c.asOf,
          epsBasis: "unverified",
          epsCurrency: "USD per share",
          consensus: c.rows,
        };
      },
    },
  ];
  await Promise.all(
    plans.map(async (p) => {
      const start = Date.now();
      const trace: ToolTrace = {
        tool: p.name,
        label: p.label,
        skill: "Public primary-source fallback",
        endpoint: p.url,
        arguments: { symbol },
        startedAt: retrievedAt,
        durationMs: 0,
        status: "failed",
        error: null,
        evidenceId: null,
      };
      try {
        const value: Record<string, any> = p.parse(
          await getJson(p.url, p.name.startsWith("sec")),
        );
        // One complete JSON record per line keeps each financial period together in quotations.
        const records = value.financials || value.consensus;
        const text = records
          ? JSON.stringify({
              ...value,
              financials: undefined,
              consensus: undefined,
            }) +
            "\n" +
            records
              .map((r: any) =>
                JSON.stringify({
                  ...value,
                  financials: undefined,
                  consensus: undefined,
                  ...r,
                }),
              )
              .join("\n")
          : JSON.stringify(value);
        const id = `fund-${p.name}-${symbol}`;
        evidence.push({
          id,
          url: p.url,
          title: p.label,
          text,
          publishedAt: null,
          retrievedAt,
          hash: hash(text),
          kind: p.name.startsWith("sec") ? "official" : "market-data",
          warnings: bundle.warnings,
        });
        trace.status = "success";
        trace.evidenceId = id;
      } catch (e) {
        trace.error = e instanceof Error ? e.message : "Unavailable";
      } finally {
        trace.durationMs = Date.now() - start;
        traces.push(trace);
      }
    }),
  );
  return { bundle, evidence, traces };
}
