import { z } from "zod";
export const Input = z.object({
  question: z.string().trim().min(8).max(2000),
  symbol: z.enum(["AAPL", "MSFT", "NVDA"]),
  mode: z.enum(["live", "case"]),
  caseId: z.string().optional(),
  officialSourceUrl: z.string().url().max(1000).optional(),
  useModel: z.boolean().default(false),
  horizon: z
    .enum(["next-session", "one-week", "one-month"])
    .default("next-session"),
  riskPreference: z
    .enum(["conservative", "balanced", "aggressive"])
    .default("balanced"),
  language: z.enum(["zh", "en"]).default("zh"),
});
export type ResearchInput = Omit<
  z.infer<typeof Input>,
  "horizon" | "riskPreference"
> & {
  horizon?: z.infer<typeof Input>["horizon"];
  riskPreference?: z.infer<typeof Input>["riskPreference"];
};
export type Evidence = {
  id: string;
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
  retrievedAt: string;
  hash: string;
  kind: "official" | "synthetic" | "market-data";
  warnings: string[];
};
export type Market = {
  provider: string;
  retrievedAt: string;
  status: "context-only" | "unavailable";
  raw: unknown;
  warnings: string[];
  session: string;
};
const Claim = z.object({
  text: z.string().min(1),
  evidenceIds: z.array(z.string()).min(1),
  quote: z.string().min(8),
});
const Impact = Claim.extend({
  businessEffect: z.string().min(1),
  assetEffect: z.string().min(1),
  uncertainty: z.string().min(1),
  test: z.string().min(1),
});
export type ToolTrace = {
  tool: string;
  label: string;
  skill: string;
  endpoint: string;
  arguments: Record<string, unknown>;
  startedAt: string;
  durationMs: number;
  status: "success" | "failed";
  error: string | null;
  evidenceId: string | null;
};
export type Stage = {
  name: string;
  status: "running" | "complete" | "failed";
  at: string;
  detail: string;
};
export const Analysis = z.object({
  summary: z.string(),
  impactChain: z.array(Impact).default([]),
  bullCase: z.string().default(""),
  bearCase: z.string().default(""),
  decisionQuestion: z.string().default(""),
  facts: z.array(Claim),
  inferences: z.array(Claim),
  counterEvidence: z.array(Claim),
  invalidationConditions: z.array(z.string()),
  watchIndicators: z.array(z.string()),
  waitConditions: z.array(z.string()).min(1),
  conclusion: z.enum(["observe", "wait", "insufficient"]),
  limitations: z.array(z.string()).min(1),
  citationReview: z
    .object({
      checked: z.number(),
      removed: z.number(),
      status: z.enum(["reviewed", "unavailable"]),
      notes: z.array(z.string()),
    })
    .optional(),
});
export type AnalysisType = z.infer<typeof Analysis>;
export type NativeQuote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: "USD";
  instrumentType: "EQUITY";
  price: number;
  observedAt: string;
  retrievedAt: string;
  freshness: string;
  session: string;
  delay: "unknown";
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  candles: { at: string; close: number }[];
  warnings: string[];
};
export type Venue = {
  symbol: string;
  product: "stock-perpetual";
  quoteCurrency: string;
  observedAt: string;
  freshness: string;
  last: number;
  bid: number;
  ask: number;
  spreadBps: number;
  bidSize: number | null;
  askSize: number | null;
  volume24h: number | null;
  turnover24h: number | null;
  fundingRate: number | null;
  bids: { price: number | null; quantity: number | null }[];
  asks: { price: number | null; quantity: number | null }[];
  bookObservedAt: string | null;
  candles: { at: string; close: number }[];
  warnings: string[];
};
export type Run = {
  id: string;
  createdAt: string;
  status: "running" | "complete" | "partial" | "failed";
  input: ResearchInput;
  evidence: Evidence[];
  market: Market | null;
  analysis: AnalysisType | null;
  errors: string[];
  engine: "llm" | "case-replay" | "none";
  durationMs: number;
  usage: unknown;
  stages?: Stage[];
  tools?: ToolTrace[];
  venue?: Venue | null;
  native?: NativeQuote | null;
  fundamentals?: FundamentalBundle | null;
  macro?: {
    provider: string;
    unit: string;
    observedDate: string;
    rates: Record<string, number>;
    previous: { date: string; rates: Record<string, number> } | null;
  } | null;
};
export type FinancialFact = {
  metric: string;
  tag: string;
  unit: string;
  value: number;
  start: string | null;
  end: string;
  filed: string;
  accession: string;
  form: string;
  period: "quarter" | "annual" | "instant";
  filingUrl: string;
};
export type ConsensusRow = {
  fiscalEnd: string;
  period: "quarter" | "annual";
  eps: number;
  high: number | null;
  low: number | null;
  analysts: number;
};
export type FundamentalBundle = {
  symbol: string;
  retrievedAt: string;
  companyName: string | null;
  industry: string | null;
  sector: string | null;
  financials: FinancialFact[];
  consensus: ConsensusRow[];
  consensusAsOf: string | null;
  warnings: string[];
};
