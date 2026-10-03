import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSec, parseConsensus } from "../lib/fundamentals";
import { applyReview } from "../lib/citation-review";
import { quoteBank } from "../lib/quotations";
import {parseTreasury} from "../lib/macro";
test("Treasury XML requires actual dated numeric yields and rejects stale observations",()=>{
  const xml=`<feed xmlns:d="data"><entry><d:NEW_DATE>2026-10-02T00:00:00</d:NEW_DATE><d:BC_3MONTH>4.0</d:BC_3MONTH><d:BC_2YEAR>3.8</d:BC_2YEAR><d:BC_10YEAR>4.2</d:BC_10YEAR></entry></feed>`;
  assert.equal(parseTreasury(xml,new Date("2026-10-03")).rates["10Y"],4.2);
  assert.throws(()=>parseTreasury(xml,new Date("2026-11-03")),/older/);
  assert.throws(()=>parseTreasury(xml,new Date("2026-09-03")),/No usable/);
  assert.throws(()=>parseTreasury("<html>error</html>"),/No usable/);
});
const row = {
  start: "2026-01-01",
  end: "2026-03-31",
  val: 100,
  accn: "0001045810-26-000001",
  form: "10-Q",
  filed: "2026-04-20",
};
test("SEC rejects issuer mismatch, excludes year-to-date and future filings, keeps latest restatement", () => {
  const raw = {
    cik: 1045810,
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              row,
              { ...row, val: 101, filed: "2026-05-20" },
              { ...row, start: "2025-10-01", val: 200 },
              { ...row, val: 999, filed: "2030-01-01" },
            ],
          },
        },
      },
    },
  };
  assert.throws(() => parseSec(raw, "AAPL"), /identity/);
  const out = parseSec(raw, "NVDA", new Date("2026-10-03"));
  assert.equal(out.length, 1);
  assert.equal(out[0].value, 101);
  assert.equal(out[0].period, "quarter");
  assert.equal(out[0].unit, "USD");
});
test("consensus validates issuer, estimate count and bounds; update time remains unknown", () => {
  const r = {
    status: { rCode: 200 },
    data: {
      symbol: "nvda",
      quarterlyForecast: {
        asOf: null,
        rows: [
          {
            fiscalEnd: "Oct 2026",
            consensusEPSForecast: 2.4,
            highEPSForecast: 2.7,
            lowEPSForecast: 2.1,
            noOfEstimates: 13,
          },
        ],
      },
    },
  };
  assert.equal(parseConsensus(r, "NVDA").asOf, null);
  assert.equal(parseConsensus(r, "NVDA").rows[0].analysts, 13);
  assert.throws(() => parseConsensus(r, "MSFT"));
  r.data.quarterlyForecast.rows[0].lowEPSForecast = 3;
  assert.throws(() => parseConsensus(r, "NVDA"), /empty/);
});
test("semantic review drops partially supported compound facts and suppresses dependent conclusion", () => {
  const a: any = {
    summary: "two announcements",
    facts: [{ text: "A and B", quote: "Only A", evidenceIds: ["e"] }],
    counterEvidence: [],
    impactChain: [],
    inferences: [{ text: "inference" }],
    limitations: ["limit"],
    bullCase: "bull",
    bearCase: "bear",
    conclusion: "wait",
  };
  const out = applyReview(
    a,
    [{ id: "facts:0", supported: false, reason: "B missing" }],
    true,
  );
  assert.equal(out.facts.length, 0);
  assert.equal(out.conclusion, "insufficient");
  assert.equal(out.inferences.length, 0);
  assert.equal(out.citationReview?.removed, 1);
  assert.throws(() => applyReview(a, [], true), /incomplete/);
});
test("financial quote records keep fiscal dates and numbers in the same excerpt", () => {
  const text = JSON.stringify({
    metric: "revenue",
    start: "2026-04-27",
    end: "2026-07-26",
    value: 96221000000,
    filed: "2026-08-26",
    unit: "USD",
  });
  const qs = quoteBank([
    {
      id: "fund-sec-NVDA",
      text,
      url: "https://data.sec.gov",
      title: "SEC",
      hash: "fixture",
      kind: "synthetic",
      retrievedAt: "2026-10-03",
      publishedAt: null,
      warnings: [],
    },
  ]);
  assert.equal(qs[0].text, text);
});
