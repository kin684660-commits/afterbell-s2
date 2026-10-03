export type Case = {
  id: string;
  symbol: "AAPL" | "MSFT" | "NVDA";
  title: string;
  url: string;
  date: string;
  excerpt: string;
  synthetic: boolean;
  scenario: string;
  expected: string;
};
const sources: [Case["symbol"], string, string, string, string][] = [
  [
    "AAPL",
    "Apple Q2 FY24",
    "https://www.apple.com/newsroom/2024/05/apple-reports-second-quarter-results/",
    "2024-05-02",
    "Revenue $90.8 billion, down 4%; additional $110 billion repurchase authorization.",
  ],
  [
    "AAPL",
    "Apple Q3 FY24",
    "https://www.apple.com/newsroom/2024/08/apple-reports-third-quarter-results/",
    "2024-08-01",
    "Revenue $85.8 billion, up 5%; diluted EPS $1.40, up 11%.",
  ],
  [
    "AAPL",
    "Apple Q4 FY24",
    "https://www.apple.com/newsroom/2024/10/apple-reports-fourth-quarter-results/",
    "2024-10-31",
    "Revenue $94.9 billion, up 6%; GAAP diluted EPS $0.97, adjusted for the one-time charge $1.64.",
  ],
  [
    "MSFT",
    "Microsoft FY24 Q4",
    "https://news.microsoft.com/source/2024/07/30/microsoft-cloud-strength-drives-fourth-quarter-results-6/",
    "2024-07-30",
    "Revenue $64.7 billion, up 15%; Azure and other cloud services revenue grew 29%.",
  ],
  [
    "MSFT",
    "Microsoft FY25 Q1",
    "https://news.microsoft.com/source/2024/10/30/microsoft-cloud-strength-drives-first-quarter-results-7/",
    "2024-10-30",
    "Revenue $65.6 billion, up 16%; operating income $30.6 billion, up 14%; diluted EPS $3.30, up 10%.",
  ],
  [
    "NVDA",
    "NVIDIA FY24 Q4",
    "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2024",
    "2024-02-21",
    "Revenue $22.1 billion, up 265%; data center revenue $18.4 billion; next-quarter revenue guidance $24 billion plus or minus 2%.",
  ],
  [
    "NVDA",
    "NVIDIA FY25 Q1",
    "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-first-quarter-fiscal-2025",
    "2024-05-22",
    "Revenue $26 billion, up 262%; ten-for-one stock split announced.",
  ],
  [
    "NVDA",
    "NVIDIA FY25 Q2",
    "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2025/",
    "2024-08-28",
    "Revenue $30 billion, up 122%; additional $50 billion repurchase authorization.",
  ],
  [
    "MSFT",
    "FOMC June 2024",
    "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240612a.htm",
    "2024-06-12",
    "Target federal funds rate maintained at 5.25–5.50%; inflation remained elevated.",
  ],
  [
    "NVDA",
    "FOMC September 2024",
    "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240918a.htm",
    "2024-09-18",
    "Target federal funds rate reduced by 50 basis points to 4.75–5.00%.",
  ],
];
const variations = [
  "duplicate-url",
  "duplicate-document",
  "gaap-vs-adjusted",
  "conflicting-time",
  "missing-quote",
  "stale-quote",
  "unverified-token-mapping",
  "unverified-conflicting-source",
  "prompt-injection",
  "insufficient-valuation",
];
export const cases: Case[] = sources
  .map((s, i) => ({
    id: `event-${i + 1}`,
    symbol: s[0],
    title: s[1],
    url: s[2],
    date: s[3],
    excerpt: s[4],
    synthetic: false,
    scenario: "official-event",
    expected:
      "Cite the official fact; distinguish business implications from price surprise; flag absent executable pricing.",
  }))
  .concat(
    variations.map((scenario, i) => {
      const s = sources[i];
      return {
        id: `stress-${i + 1}`,
        symbol: s[0],
        title: `${s[1]} · ${scenario}`,
        url: s[2],
        date: s[3],
        excerpt: s[4],
        synthetic: true,
        scenario,
        expected: `Detect ${scenario}; no unsupported trade conclusion; retain provenance and uncertainty.`,
      };
    }),
  );
