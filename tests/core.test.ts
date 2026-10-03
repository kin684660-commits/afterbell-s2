import { test } from "node:test";
import assert from "node:assert/strict";
import { Input } from "../lib/types";
import {
  freshness,
  marketSession,
  validateAnalysis,
  enforceResearchOnly,
} from "../lib/guardrails";
import { dedupe } from "../lib/sources";
import { cases } from "../lib/cases";
import { research } from "../lib/research";
import { get } from "../lib/store";
import { markdown } from "../lib/export";
import { parseRpc, unwrapData } from "../lib/mcp";
process.env.AFTERBELL_DATABASE_PATH = `data/test-${process.pid}.sqlite`;
test("reject malformed and unbounded research inputs", () => {
  assert.equal(
    Input.safeParse({ symbol: "BTC", mode: "live", question: "x" }).success,
    false,
  );
  assert.equal(
    Input.safeParse({
      symbol: "NVDA",
      mode: "case",
      question: "x".repeat(2001),
    }).success,
    false,
  );
});
test("freshness distinguishes absent stale future timestamps", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  assert.equal(freshness(null, now), "unknown");
  assert.equal(freshness("2026-10-03T11:59:00Z", now), "fresh");
  assert.equal(freshness("2026-10-02T12:00:00Z", now), "stale");
  assert.equal(freshness("2026-10-04T12:00:00Z", now), "invalid");
});
test("New York time and DST correctly classify session without claiming calendar verification", () => {
  assert.equal(marketSession(new Date("2026-10-03T14:00:00Z")), "weekend");
  assert.equal(
    marketSession(new Date("2026-07-01T13:30:00Z")),
    "regular-hours",
  );
  assert.equal(
    marketSession(new Date("2026-01-05T14:30:00Z")),
    "regular-hours",
  );
  assert.equal(
    marketSession(new Date("2026-01-05T13:30:00Z")),
    "outside-regular-hours",
  );
});
test("parser supports JSON and SSE", () => {
  assert.deepEqual(parseRpc('data: {"result":{"ok":true}}\n'), {
    result: { ok: true },
  });
  assert.deepEqual(parseRpc('{"result":1}'), { result: 1 });
});
test("citations cannot refer to uncollected sources", () => {
  const a = {
    summary: "Test",
    facts: [
      { text: "Invented", evidenceIds: ["missing"], quote: "fake quotation" },
    ],
    inferences: [],
    counterEvidence: [],
    invalidationConditions: [],
    watchIndicators: [],
    waitConditions: ["Wait"],
    conclusion: "observe",
    limitations: ["No pricing"],
  };
  assert.throws(() => validateAnalysis(a, []));
  assert.equal(
    enforceResearchOnly({ ...a, facts: [] } as never).conclusion,
    "wait",
  );
});
test("duplicates are merged by URL or content hash", () => {
  const a = { id: "1", url: "https://www.apple.com", hash: "same" };
  assert.equal(dedupe([a, { ...a, id: "2" }] as never).length, 1);
});
test("20 labeled source-backed cases, no fake real-world stress events", () => {
  assert.equal(cases.length, 20);
  assert.equal(cases.filter((c) => c.synthetic).length, 10);
  assert.ok(cases.every((c) => c.url.startsWith("https://")));
});
test("replay persists, reloads and exports without claiming model or trades", async () => {
  const r = await research({
    symbol: "NVDA",
    mode: "case",
    caseId: "event-6",
    question: "What information is still missing?",
    language: "en",
    useModel: false,
  });
  assert.equal(r.status, "complete");
  assert.equal(r.engine, "case-replay");
  assert.equal(r.analysis?.conclusion, "insufficient");
  assert.equal(get(r.id)?.id, r.id);
  assert.match(markdown(r), /case-replay/);
  assert.equal(r.market, null);
});
test("invalid replay selection is a reported failure", async () => {
  const r = await research({
    symbol: "AAPL",
    mode: "case",
    caseId: "event-6",
    question: "Check this event please",
    language: "en",
    useModel: false,
  });
  assert.equal(r.status, "failed");
  assert.ok(r.errors.length);
});

test("market holidays and early close are respected", () => {
  assert.equal(marketSession(new Date("2026-07-03T15:00:00Z")), "holiday");
  assert.equal(
    marketSession(new Date("2026-11-27T18:00:00Z")),
    "outside-regular-hours",
  );
  assert.equal(
    marketSession(new Date("2026-11-27T17:59:00Z")),
    "regular-hours",
  );
  assert.equal(
    marketSession(new Date("2030-01-02T15:00:00Z")),
    "calendar-unverified",
  );
});
test("HTTP-200 MCP wrapper with upstream 503 is not market data", () => {
  assert.throws(() =>
    unwrapData({ structuredContent: { success: false, status_code: 503 } }),
  );
});
