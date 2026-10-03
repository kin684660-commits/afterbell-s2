import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { Evidence } from "./types";
export function hash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
export function dedupe(items: Evidence[]) {
  return items.filter(
    (e, i, a) => a.findIndex((x) => x.url === e.url || x.hash === e.hash) === i,
  );
}
export async function retrieve(url: string): Promise<Evidence> {
  const u = new URL(url);
  const allowed = [
    "www.apple.com",
    "news.microsoft.com",
    "www.microsoft.com",
    "blogs.microsoft.com",
    "news.xbox.com",
    "nvidianews.nvidia.com",
    "blogs.nvidia.com",
    "www.federalreserve.gov",
    "www.sec.gov",
  ];
  if (u.protocol !== "https:" || !allowed.includes(u.hostname))
    throw new Error("Unsupported official source");
  const res = await fetch(u, {
    signal: AbortSignal.timeout(12000),
    redirect: "error",
    headers: {
      "User-Agent":
        process.env.AFTERBELL_SEC_USER_AGENT || "Afterbell research prototype",
    },
  });
  if (!res.ok) throw new Error(`Official source HTTP ${res.status}`);
  const html = await res.text();
  if (html.length > 3000000) throw new Error("Source too large");
  const $ = load(html);
  const canonical = $('link[rel="canonical"]').attr("href");
  if (
    canonical &&
    new URL(canonical, u).pathname.replace(/\/$/, "") !==
      u.pathname.replace(/\/$/, "")
  )
    throw new Error(
      "Official source canonical path does not match requested event",
    );
  $("script,style,nav,footer").remove();
  const selectors = [
    ".article-body",
    ".column--content",
    ".entry-content",
    "#article",
    ".page-body",
    "article",
    "main",
  ];
  const candidates = selectors
    .map((selector) => $(selector).first().text().trim())
    .filter((text) => text.length >= 100);
  if (!candidates.length)
    throw new Error(
      "Official article body not found; index pages are not evidence",
    );
  const text = candidates[0].replace(/\s+/g, " ").trim().slice(0, 18000);
  if (text.length < 100) throw new Error("Source content incomplete");
  return {
    id: `e-${hash(url).slice(0, 10)}`,
    url,
    title: $("title").text(),
    text,
    publishedAt:
      $('meta[property="article:published_time"]').attr("content") || null,
    retrievedAt: new Date().toISOString(),
    hash: hash(text),
    kind: "official",
    warnings: [
      "Page fetched now; publication timestamp is not independently authenticated.",
    ],
  };
}
export async function officialSources(symbol: string) {
  const feeds =
    symbol === "AAPL"
      ? ["https://www.apple.com/newsroom/rss-feed.rss"]
      : symbol === "NVDA"
        ? ["https://nvidianews.nvidia.com/releases.xml", "https://blogs.nvidia.com/feed/"]
        : ["https://news.microsoft.com/source/feed/"];
  feeds.push("https://www.federalreserve.gov/feeds/press_all.xml");
  const errors: string[] = [];
  const candidates: { url: string; date: string | null; priority: number }[] = [];
  await Promise.all(
    feeds.map(async (feed, priority) => {
      try {
        const r = await fetch(feed, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error(`Feed HTTP ${r.status}`);
        const $ = load(await r.text(), { xmlMode: true });
        $("item,entry")
          .slice(0, 2)
          .each((_, el) => {
            const item = $(el);
            const url =
              item.find("link").text().trim() || item.find("link").attr("href");
            const date = item.find("pubDate,published,updated").first().text();
            if (url)
              candidates.push({
                url,
                priority,
                date:
                  date && !Number.isNaN(Date.parse(date))
                    ? new Date(date).toISOString()
                    : null,
              });
          });
      } catch {
        errors.push(
          `Official event feed unavailable: ${new URL(feed).hostname}`,
        );
      }
    }),
  );
  const ordered = candidates.sort((a, b) => a.priority - b.priority);
  const company = ordered.filter((c) => !new URL(c.url).hostname.endsWith("federalreserve.gov"));
  const macro = ordered.filter((c) => new URL(c.url).hostname.endsWith("federalreserve.gov"));
  const selected = [...company.slice(0, 2), ...macro.slice(0, 2)];
  const results = await Promise.allSettled(
    selected.map(async (c) => {
      const e = await retrieve(c.url);
      return {
        ...e,
        publishedAt: e.publishedAt || c.date,
        warnings: [
          ...e.warnings,
          "Feed inclusion does not establish materiality; check event relevance.",
        ],
      };
    }),
  );
  return {
    evidence: dedupe(
      results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    ),
    errors: [
      ...errors,
      ...results.flatMap((r) =>
        r.status === "rejected" ? [String(r.reason)] : [],
      ),
    ],
  };
}
