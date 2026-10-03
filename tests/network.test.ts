import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../lib/model";
import { retrieve } from "../lib/sources";
import { validateAnalysis } from "../lib/guardrails";
import { scenario } from "../lib/scenarios";
import type { Evidence } from "../lib/types";
const evidence: Evidence = {
  id: "e1",
  url: "https://www.apple.com/newsroom/",
  title: "Test fixture",
  text: "Reported revenue was 90.8 billion dollars.",
  publishedAt: null,
  retrievedAt: new Date().toISOString(),
  hash: "fixture",
  kind: "synthetic",
  warnings: ["Unit test fixture"],
};
const output = {
  summary: "Reported results require expectations context.",
  facts: [
    {
      text: "Reported revenue was 90.8 billion dollars.",
      evidenceIds: ["e1"],
      quote: "Reported revenue was 90.8 billion dollars.",
    },
  ],
  inferences: [],
  counterEvidence: [],
  invalidationConditions: ["New clarification"],
  watchIndicators: ["Consensus"],
  waitConditions: ["No executable pricing"],
  conclusion: "observe",
  limitations: ["Fixture only"],
};
test("even existing citation IDs cannot authenticate invented quotes", () => {
  assert.throws(() =>
    validateAnalysis(
      {
        ...output,
        facts: [{ ...output.facts[0], quote: "Fabricated source quotation" }],
      },
      [evidence],
    ),
  );
});
test("source retrieval refuses arbitrary hosts before any network request", async () => {
  await assert.rejects(retrieve("https://localhost/private"), /Unsupported/);
  await assert.rejects(
    retrieve("https://www.apple.com.evil.example/"),
    /Unsupported/,
  );
});
test("official canonical mismatch is rejected instead of capturing an archive page", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        '<html><head><link rel="canonical" href="https://nvidianews.nvidia.com/news"/></head><body><article>Wrong archive content repeated enough to look like an article. Wrong archive content repeated enough to look like an article.</article></body></html>',
      ),
  );
  await assert.rejects(
    retrieve("https://nvidianews.nvidia.com/news/old-event"),
    /canonical path/,
  );
});
test("article-body wins over sidebar articles", async (t) => {
  const official =
    "Actual historical release body with revenue and risk information. ".repeat(
      3,
    );
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        `<html><body><article>Unrelated current sidebar news. ${"other news ".repeat(30)}</article><div class="article-body">${official}</div></body></html>`,
      ),
  );
  const e = await retrieve("https://nvidianews.nvidia.com/news/fixture");
  assert.ok(e.text.startsWith("Actual historical"));
  assert.equal(e.text.includes("Unrelated"), false);
});
test("provider rate limit and malformed JSON become explicit failures", async (t) => {
  const old = {
    base: process.env.AFTERBELL_API_BASE,
    model: process.env.AFTERBELL_MODEL,
    key: process.env.AFTERBELL_API_KEY,
  };
  process.env.AFTERBELL_API_BASE = "https://example.invalid";
  process.env.AFTERBELL_MODEL = "fixture";
  process.env.AFTERBELL_API_KEY = "test-only";
  t.after(() => {
    for (const [name, value] of Object.entries({
      AFTERBELL_API_BASE: old.base,
      AFTERBELL_MODEL: old.model,
      AFTERBELL_API_KEY: old.key,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 429 }),
  );
  const input = {
    question: "Check the test event",
    symbol: "AAPL" as const,
    mode: "live" as const,
    language: "en" as const,
    useModel: true,
  };
  await assert.rejects(analyze(input, [evidence], null), /429/);
  mock.mock.mockImplementation(async () =>
    Response.json({ choices: [{ message: { content: "not JSON" } }] }),
  );
  await assert.rejects(analyze(input, [evidence], null), SyntaxError);
  mock.mock.mockImplementation(async () => {
    throw new DOMException("Timed out", "TimeoutError");
  });
  await assert.rejects(analyze(input, [evidence], null), /Timed out/);
  mock.mock.mockImplementation(async () =>
    Response.json({
      choices: [{ message: { content: JSON.stringify(output) } }],
      usage: { total_tokens: 10 },
    }),
  );
  const result = await analyze(input, [evidence], null);
  assert.equal(result.analysis.conclusion, "insufficient");
  assert.equal(result.analysis.citationReview?.status, "unavailable");
  assert.equal(result.analysis.facts.length, 0);
  mock.mock.mockImplementation(async (_url: unknown, options: any) => {
    const request = JSON.parse(options.body);
    const review = request.messages[0].content.includes("audit factual");
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify(
              review
                ? {
                    reviews: [
                      {
                        id: "facts:0",
                        supported: true,
                        reason: "Exact reported number",
                      },
                    ],
                  }
                : output,
            ),
          },
        },
      ],
      usage: { total_tokens: 10 },
    });
  });
  const checked = await analyze(input, [evidence], null);
  assert.equal(checked.analysis.conclusion, "wait");
  assert.equal(checked.analysis.citationReview?.checked, 1);
  assert.deepEqual(checked.usage, {
    attempts: [{ total_tokens: 10 }],
    citationReview: { total_tokens: 10 },
  });
});
test("synthetic stress cases really perturb data, and duplicate cases deduplicate", () => {
  assert.equal(scenario("stress-1", "AAPL").evidence.length, 1);
  assert.equal(scenario("stress-2", "AAPL").evidence.length, 1);
  const injection = scenario("stress-9", "MSFT");
  assert.ok(injection.evidence[0].text.includes("IGNORE ALL RULES"));
  assert.equal(injection.evidence[0].kind, "synthetic");
  const stale = scenario("stress-6", "NVDA");
  assert.equal(stale.market?.status, "unavailable");
  assert.match(stale.market!.warnings.join(" "), /stale/);
});
import { usable } from "../lib/context";
import { validateVenue } from "../lib/venue";
test("empty official tool payloads are not usable data", () => {
  assert.equal(usable([{ feed: "cnbc", error: "", items: [] }]), false);
  assert.equal(
    usable({ t10y: { error: "" }, yield_curve_inverted: false }),
    false,
  );
  assert.equal(usable({ t10y: { value: 4.1, date: "2026-10-02" } }), true);
});
test("venue mapping requires stock-perpetual metadata and sane quotes", () => {
  const i = {
    symbol: "NVDAUSDT",
    baseCoin: "NVDA",
    symbolType: "stock",
    category: "USDT-FUTURES",
    type: "perpetual",
    status: "online",
    quoteCoin: "USDT",
  };
  const t = {
    symbol: "NVDAUSDT",
    ts: Date.now(),
    bid1Price: "100",
    ask1Price: "101",
    lastPrice: "100.5",
  };
  assert.throws(() =>
    validateVenue("NVDA", { ...i, baseCoin: "BTC" }, t, null),
  );
  assert.throws(() =>
    validateVenue("NVDA", i, { ...t, bid1Price: "102" }, null),
  );
  const v = validateVenue("NVDA", i, t, null);
  assert.equal(v.product, "stock-perpetual");
  assert.ok(v.spreadBps > 0);
  assert.equal(v.freshness, "fresh");
});
import { parseNative } from "../lib/native";
test("native quote requires matching exchange equity identity and valid observation time", () => {
  const meta = {
    symbol: "NVDA",
    currency: "USD",
    instrumentType: "EQUITY",
    exchangeName: "NMS",
    regularMarketPrice: 200,
    regularMarketTime: Date.now() / 1000 - 86400,
  };
  const v = parseNative("NVDA", { meta });
  assert.equal(v.freshness, "stale");
  assert.equal(v.delay, "unknown");
  assert.throws(() => parseNative("AAPL", { meta }));
  assert.throws(() =>
    parseNative("NVDA", { meta: { ...meta, instrumentType: "ETF" } }),
  );
  assert.throws(() =>
    parseNative("NVDA", {
      meta: { ...meta, regularMarketTime: Date.now() / 1000 + 3600 },
    }),
  );
});

import { bindQuotes, quoteBank } from "../lib/quotations";
test("quote selection binds only acquired text and rejects invented ids", () => {
  const bank = quoteBank([evidence]);
  const claim = {
    text: "Reported revenue",
    evidenceIds: ["e1"],
    quoteId: bank[0].quoteId,
  };
  const v = bindQuotes({ facts: [claim] }, [evidence]) as any;
  assert.equal(v.facts[0].quote, evidence.text);
  assert.throws(() =>
    bindQuotes({ facts: [{ ...claim, quoteId: "fake:q1" }] }, [evidence]),
  );
  assert.throws(() =>
    bindQuotes({ facts: [{ ...claim, evidenceIds: ["missing"] }] }, [evidence]),
  );
});
