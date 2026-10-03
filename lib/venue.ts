import { hash } from "./sources";
import { freshness } from "./guardrails";
import type { Evidence, ToolTrace, Venue } from "./types";
export function validateVenue(
  symbol: string,
  instrument: any,
  ticker: any,
  book: any,
): Venue {
  if (
    instrument?.baseCoin !== symbol ||
    instrument?.symbolType !== "stock" ||
    instrument?.category !== "USDT-FUTURES" ||
    instrument?.type !== "perpetual" ||
    instrument?.status !== "online" ||
    ticker?.symbol !== instrument.symbol
  )
    throw Error("Stock perpetual instrument identity not verified");
  const num = (v: unknown) =>
    v !== "" && v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  const ts = num(ticker.ts);
  const bid = num(ticker.bid1Price);
  const ask = num(ticker.ask1Price);
  const last = num(ticker.lastPrice);
  if (!ts || !bid || !ask || !last || bid > ask)
    throw Error("Quote fields missing or crossed");
  const observedAt = new Date(ts).toISOString();
  const age = freshness(observedAt);
  const spreadBps = ((ask - bid) / ((ask + bid) / 2)) * 10000;
  const depth = (levels: any) =>
    Array.isArray(levels)
      ? levels
          .slice(0, 5)
          .map((x: any) => ({ price: num(x[0]), quantity: num(x[1]) }))
          .filter((x: any) => x.price != null && x.quantity != null)
      : [];
  return {
    symbol: instrument.symbol,
    product: "stock-perpetual",
    quoteCurrency: instrument.quoteCoin,
    observedAt,
    freshness: age,
    last,
    bid,
    ask,
    spreadBps,
    bidSize: num(ticker.bid1Size),
    askSize: num(ticker.ask1Size),
    volume24h: num(ticker.volume24h),
    turnover24h: num(ticker.turnover24h),
    fundingRate: num(ticker.fundingRate),
    bids: depth(book?.bids),
    asks: depth(book?.asks),
    bookObservedAt: num(book?.ts)
      ? new Date(Number(book.ts)).toISOString()
      : null,
    candles: [],
    warnings: [
      "Verified exchange stock-perpetual identity, not native shares or redeemable token ownership.",
      "Public quote is a snapshot, not guaranteed execution; order size, fees, funding, basis and instrument trading schedule remain relevant.",
      "No synchronized native US-equity quote: no cross-market premium or arbitrage calculation.",
    ],
  };
}
export async function venueContext(
  symbol: string,
): Promise<{ venue: Venue | null; evidence: Evidence[]; traces: ToolTrace[] }> {
  const { loadConfig, BitgetRestClient, buildTools, safeInvoke } =
    await import("@bitget-ai/bitget-agent-sdk");
  const config = loadConfig({
    modules: "market",
    readOnly: true,
    apiKey: "",
    secretKey: "",
    passphrase: "",
    baseUrl: "https://api.bitget.com",
    timeoutMs: 15000,
  });
  const client = new BitgetRestClient(config);
  const tools = buildTools(config);
  const ctx = { config, client };
  const market = tools.find((t) => t.name === "market")!;
  const discover = tools.find((t) => t.name === "discover")!;
  const traces: ToolTrace[] = [];
  const evidence: Evidence[] = [];
  async function invoke(
    action: string,
    args: Record<string, unknown>,
    label: string,
  ) {
    const startedAt = new Date().toISOString(),
      start = Date.now();
    const trace: ToolTrace = {
      tool: `market.${action}`,
      label,
      skill: "Bitget Skill / Agent SDK · readOnly",
      endpoint: "https://api.bitget.com",
      arguments: args,
      startedAt,
      durationMs: 0,
      status: "failed",
      error: null,
      evidenceId: null,
    };
    try {
      const contract = await safeInvoke(
        discover,
        { tool: "market", action },
        ctx,
      );
      if (
        !contract.ok ||
        (contract.data as any).riskLevel !== "read" ||
        (contract.data as any).auth !== "public"
      )
        throw Error("Public read-only contract not verified");
      const r = await safeInvoke(market, { action, ...args }, ctx);
      if (!r.ok) throw Error(r.error.message);
      if (r.data == null || (Array.isArray(r.data) && !r.data.length))
        throw Error("Empty market response");
      trace.status = "success";
      const text = JSON.stringify(r.data, null, 2).slice(0, 14000);
      const id = `venue-${action}-${symbol}`;
      trace.evidenceId = id;
      evidence.push({
        id,
        url: `https://api.bitget.com/api/v3/market/${action}?${new URLSearchParams(args as Record<string, string>)}`,
        title: label,
        text,
        hash: hash(text),
        kind: "market-data",
        publishedAt: null,
        retrievedAt: new Date().toISOString(),
        warnings: [
          "Actual read-only Bitget SDK response. Stock perpetual, not native equity or redeemable token.",
          "Quote observation time and orderbook observation time are separate.",
        ],
      });
      return r.data;
    } catch (e) {
      trace.error = e instanceof Error ? e.message : "Unavailable";
      return null;
    } finally {
      trace.durationMs = Date.now() - start;
      traces.push(trace);
    }
  }
  const pair = symbol + "USDT";
  const base = { category: "USDT-FUTURES", symbol: pair };
  const instruments = await invoke("instruments", base, "永续合约身份核验");
  const instrument = Array.isArray(instruments)
    ? instruments.find((x) => x.symbol === pair)
    : null;
  if (
    !instrument ||
    instrument.baseCoin !== symbol ||
    instrument.symbolType !== "stock" ||
    instrument.type !== "perpetual"
  )
    return { venue: null, evidence, traces };
  const [tickers, book, candles] = await Promise.all([
    invoke("tickers", base, "永续合约报价与点差"),
    invoke("orderbook", { ...base, limit: "5" }, "永续合约前五档盘口"),
    invoke(
      "candles",
      { ...base, interval: "1H", limit: "48" },
      "永续合约近48小时价格",
    ),
  ]);
  try {
    const ticker = Array.isArray(tickers)
      ? tickers.find((x) => x.symbol === pair)
      : null;
    const venue = validateVenue(symbol, instrument, ticker, book);
    venue.candles = Array.isArray(candles)
      ? candles
          .map((x) => ({
            at: new Date(Number(x[0])).toISOString(),
            close: Number(x[4]),
          }))
          .filter((x) => Number.isFinite(x.close))
          .sort((a, b) => a.at.localeCompare(b.at))
      : [];
    return { venue, evidence, traces };
  } catch {
    return { venue: null, evidence, traces };
  }
}
