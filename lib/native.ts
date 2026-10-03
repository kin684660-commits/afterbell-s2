import type { Evidence, NativeQuote, ToolTrace } from "./types";
import { hash } from "./sources";
import { marketSession, freshness } from "./guardrails";
export function parseNative(symbol: string, result: any): NativeQuote {
  const m = result?.meta;
  if (
    m?.symbol !== symbol ||
    m?.instrumentType !== "EQUITY" ||
    m?.currency !== "USD" ||
    !["NMS", "NGM", "NCM", "NYQ"].includes(m?.exchangeName)
  )
    throw Error(
      "Native equity symbol, type, currency or exchange failed validation",
    );
  if (
    !Number.isFinite(m.regularMarketPrice) ||
    m.regularMarketPrice <= 0 ||
    !Number.isFinite(m.regularMarketTime)
  )
    throw Error("Native equity quote incomplete");
  const observedAt = new Date(m.regularMarketTime * 1000).toISOString();
  const age = freshness(observedAt);
  if (age === "invalid") throw Error("Native equity quote time is invalid");
  const close = result.indicators?.quote?.[0]?.close || [];
  const candles = (result.timestamp || []).flatMap((at: number, i: number) =>
    typeof close[i] === "number" && Number.isFinite(close[i])
      ? [{ at: new Date(at * 1000).toISOString(), close: close[i] }]
      : [],
  );
  return {
    symbol,
    name: m.longName || symbol,
    exchange: m.fullExchangeName || m.exchangeName,
    currency: "USD",
    instrumentType: "EQUITY",
    price: m.regularMarketPrice,
    observedAt,
    retrievedAt: new Date().toISOString(),
    freshness: age,
    session: marketSession(),
    delay: "unknown",
    dayHigh:
      typeof m.regularMarketDayHigh === "number"
        ? m.regularMarketDayHigh
        : null,
    dayLow:
      typeof m.regularMarketDayLow === "number" ? m.regularMarketDayLow : null,
    previousClose: typeof m.previousClose === "number" ? m.previousClose : null,
    volume:
      typeof m.regularMarketVolume === "number" ? m.regularMarketVolume : null,
    candles,
    warnings: [
      "Real native US equity market snapshot from Yahoo Finance; delay and exchange entitlements are not verified.",
      "Regular-market timestamp is distinct from retrieval time. On holidays/weekends this is a previous-session observation, not a live executable quote.",
      "No synchronized cross-market quote: do not compute a stock/perpetual premium or arbitrage.",
    ],
  };
}
export async function nativeContext(symbol: string): Promise<{
  native: NativeQuote | null;
  evidence: Evidence[];
  trace: ToolTrace;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=5d`;
  const start = Date.now();
  const trace: ToolTrace = {
    tool: "native-equity.chart",
    label: "原生美股报价与5日价格",
    skill: "Native equity fallback · identity/time validation",
    endpoint: "https://query1.finance.yahoo.com",
    arguments: { symbol, interval: "1h", range: "5d" },
    startedAt: new Date().toISOString(),
    durationMs: 0,
    status: "failed",
    error: null,
    evidenceId: null,
  };
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Afterbell research/0.2" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error(`Native price HTTP ${r.status}`);
    const j = await r.json();
    if (j.chart?.error) throw Error("Native quote provider error");
    const native = parseNative(symbol, j.chart?.result?.[0]);
    const id = `native-${symbol}`;
    const text = JSON.stringify(native, null, 2);
    trace.status = "success";
    trace.evidenceId = id;
    return {
      native,
      evidence: [
        {
          id,
          url: `https://finance.yahoo.com/quote/${symbol}/`,
          title: `${symbol} · 原生美股市场快照`,
          text,
          kind: "market-data",
          publishedAt: native.observedAt,
          retrievedAt: native.retrievedAt,
          hash: hash(text),
          warnings: native.warnings,
        },
      ],
      trace,
    };
  } catch (e) {
    trace.error = e instanceof Error ? e.message : "Native quote unavailable";
    const firstError = trace.error;
    try {
      const fallbackUrl = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`;
      const response = await fetch(fallbackUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error(`Nasdaq price HTTP ${response.status}`);
      const native = parseNasdaqNative(symbol, (await response.json()).data);
      native.warnings.unshift(`Yahoo unavailable: ${firstError}; actual Nasdaq fallback used.`);
      trace.endpoint = fallbackUrl;
      trace.skill = "Nasdaq native equity fallback · date-only observation validation";
      trace.status = "success";
      trace.error = null;
      trace.evidenceId = `native-${symbol}`;
      const text = JSON.stringify(native, null, 2);
      return { native, trace, evidence: [{
        id: trace.evidenceId, url: fallbackUrl,
        title: `${symbol} · Nasdaq 原生美股日期级快照`, text,
        kind: "market-data", publishedAt: native.observedAt,
        retrievedAt: native.retrievedAt, hash: hash(text), warnings: native.warnings,
      }] };
    } catch (fallbackError) {
      trace.error = `${firstError}; ${fallbackError instanceof Error ? fallbackError.message : "Nasdaq unavailable"}`;
    }
    return { native: null, evidence: [], trace };
  } finally {
    trace.durationMs = Date.now() - start;
  }
}

export function parseNasdaqNative(symbol: string, data: any): NativeQuote {
  const q = data?.primaryData;
  if (data?.symbol !== symbol || data?.assetClass !== "STOCKS" ||
      data?.stockType !== "Common Stock" || !String(data?.exchange).startsWith("NASDAQ"))
    throw Error("Nasdaq native equity identity failed validation");
  const priceText = String(q?.lastSalePrice || "");
  const price = Number(priceText.replace(/[$,]/g, ""));
  if (!priceText.startsWith("$") || !Number.isFinite(price) || price <= 0)
    throw Error("Nasdaq dollar price incomplete");
  const match = String(q?.lastTradeTimestamp || "").match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})(?:\b|$)/);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!match || !months.includes(match[1])) throw Error("Nasdaq observation date unavailable");
  const date = `${match[3]}-${String(months.indexOf(match[1]) + 1).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  if (new Date(date).toISOString().slice(0, 10) !== date || Date.parse(date) > Date.now() + 86400000)
    throw Error("Nasdaq observation date invalid");
  const volume = Number(String(q?.volume || "").replace(/,/g, ""));
  return {
    symbol, name: data.companyName || symbol, exchange: data.exchange,
    currency: "USD", instrumentType: "EQUITY", price, observedAt: date,
    retrievedAt: new Date().toISOString(), freshness: "date-only / execution-unverified",
    session: marketSession(), delay: "unknown", dayHigh: null, dayLow: null,
    previousClose: null, volume: Number.isFinite(volume) && volume > 0 ? volume : null,
    candles: [], warnings: [
      `Actual Nasdaq native stock quote. Provider timestamp: ${q.lastTradeTimestamp}. Only its calendar date is retained; no intraday timestamp is invented.`,
      "Date-only delayed observation; executable price, bid/ask and 5-day candles are unavailable. Not a real-time quote or synchronized cross-market price.",
      "Public endpoint SLA and redistribution entitlement are unverified; do not infer arbitrage.",
    ],
  };
}
