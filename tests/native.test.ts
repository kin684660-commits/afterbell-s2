import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNasdaqNative } from "../lib/native";
const snapshot = { symbol: "NVDA", assetClass: "STOCKS", stockType: "Common Stock", exchange: "NASDAQ-GS", companyName: "NVIDIA", primaryData: { lastSalePrice: "$233.95", lastTradeTimestamp: "Oct 1, 2026", volume: "135,169,179" } };
test("Nasdaq retains date-only observation without fabricating intraday time or candles", () => {
  const result = parseNasdaqNative("NVDA", snapshot);
  assert.equal(result.price, 233.95);
  assert.equal(result.observedAt, "2026-10-01");
  assert.equal(result.volume, 135169179);
  assert.equal(result.delay, "unknown");
  assert.equal(result.candles.length, 0);
  assert.match(result.freshness, /execution-unverified/);
});
test("Nasdaq rejects wrong instrument, missing dollar price and invalid dates", () => {
  assert.throws(() => parseNasdaqNative("AAPL", snapshot));
  assert.throws(() => parseNasdaqNative("NVDA", { ...snapshot, assetClass: "ETF" }));
  assert.throws(() => parseNasdaqNative("NVDA", { ...snapshot, primaryData: { ...snapshot.primaryData, lastSalePrice: "N/A" } }));
  assert.throws(() => parseNasdaqNative("NVDA", { ...snapshot, primaryData: { ...snapshot.primaryData, lastTradeTimestamp: "Feb 31, 2026" } }));
});
