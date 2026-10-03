import { ReadOnlyMcp } from "./rpc";
import { hash } from "./sources";
import type { Evidence, ToolTrace } from "./types";
export type ContextBundle = { evidence: Evidence[]; traces: ToolTrace[] };
export function usable(value: unknown): boolean {
  if (value == null || typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string")
    return value.trim().length > 4 && !/^<html/i.test(value.trim());
  if (Array.isArray(value)) return value.some(usable);
  if (typeof value === "object")
    return Object.entries(value).some(
      ([key, val]) =>
        ![
          "error",
          "success",
          "status",
          "status_code",
          "feed",
          "symbol",
          "timestamp",
          "retrievedAt",
          "yield_curve_inverted",
          "provider",
          "source",
          "message",
          "count",
        ].includes(key) && usable(val),
    );
  return false;
}
export async function tracedCall(
  client: ReadOnlyMcp,
  tool: string,
  args: Record<string, unknown>,
  label: string,
  skill: string,
): Promise<{ evidence?: Evidence; trace: ToolTrace }> {
  const start = Date.now();
  const now = new Date().toISOString();
  const trace: ToolTrace = {
    tool,
    label,
    skill,
    endpoint: client.endpoint,
    arguments: args,
    startedAt: now,
    durationMs: 0,
    status: "failed",
    error: null,
    evidenceId: null,
  };
  try {
    const raw = await client.call(tool, args);
    const value = "data" in raw ? raw.data : raw;
    if (!usable(value) || ("error" in raw && raw.error))
      throw Error("Empty or unsuccessful data response");
    const text = JSON.stringify(value, null, 2).slice(0, 14000);
    const id = `tool-${hash(client.endpoint + tool + JSON.stringify(args)).slice(0, 10)}`;
    trace.status = "success";
    trace.evidenceId = id;
    return {
      trace,
      evidence: {
        id,
        url: client.endpoint,
        title: label,
        text,
        publishedAt: null,
        retrievedAt: now,
        hash: hash(text),
        kind: "market-data",
        warnings: [
          "Actual tool response, fetched now. Retrieval time is not the observation time. Data periods and units must be checked before use.",
          "Secondary market context, not an issuer announcement. No executable quote or token mapping verified.",
        ],
      },
    };
  } catch (e) {
    trace.error = e instanceof Error ? e.message : "Data unavailable";
    return { trace };
  } finally {
    trace.durationMs = Date.now() - start;
  }
}
export async function researchContext(symbol: string): Promise<ContextBundle> {
  const equity = new ReadOnlyMcp("https://agent.bitget.com/mcp");
  const signal = new ReadOnlyMcp("https://datahub.noxiaohao.com/mcp", 25000);
  const plans = [
    {
      client: equity,
      skill: "bitget-mcp-server",
      specs: [
        ["equity_profile", "公司基本面"],
        ["equity_fundamental_income", "利润表"],
        ["equity_fundamental_ratios", "估值指标"],
        ["equity_estimates_consensus", "分析师一致预期"],
        ["equity_price_historical", "历史价格"],
      ],
    },
    {
      client: signal,
      skill: "bitget-signal / macro-analyst + news-briefing",
      specs: [
        ["rates_yields", "利率与收益率背景"],
        ["news_feed", "跨市场新闻线索"],
      ],
    },
  ];
  const parts = await Promise.all(
    plans.map(
      async (plan): Promise<{ evidence?: Evidence; trace: ToolTrace }[]> => {
        try {
          const tools = await plan.client.connect();
          let entries: any[] = [];
          if (plan.client === equity) {
            const guide = await equity.call("guide", { category: "equity" });
            entries = guide.entries as any[];
          }
          return await Promise.all(
            plan.specs.map(async ([name, label]) => {
              if (plan.client === equity) {
                if (!entries?.some((e) => e.id === name))
                  return {
                    trace: unavailable(
                      name,
                      label,
                      plan,
                      "Catalog entry unavailable",
                    ),
                  };
                return tracedCall(
                  equity,
                  "do_query",
                  {
                    entry_id: name,
                    params: {
                      symbol,
                      ...([
                        "equity_fundamental_income",
                        "equity_fundamental_ratios",
                      ].includes(name)
                        ? { limit: 2 }
                        : {}),
                    },
                  },
                  label,
                  plan.skill,
                );
              }
              if (!tools.tools?.some((t: any) => t.name === name))
                return {
                  trace: unavailable(name, label, plan, "Tool unavailable"),
                };
              return tracedCall(
                signal,
                name,
                name === "rates_yields"
                  ? { action: "rates_snapshot" }
                  : {
                      action: "latest",
                      feeds: "cnbc,fed",
                      keyword: (
                        {
                          AAPL: "Apple",
                          MSFT: "Microsoft",
                          NVDA: "NVIDIA",
                        } as Record<string, string>
                      )[symbol],
                      limit: 3,
                    },
                label,
                plan.skill,
              );
            }),
          );
        } catch (e) {
          return plan.specs.map(([tool, label]) => ({
            trace: unavailable(
              tool,
              label,
              plan,
              e instanceof Error ? e.message : "Connection unavailable",
            ),
          }));
        }
      },
    ),
  );
  const results = parts.flat();
  return {
    evidence: results.flatMap((x) =>
      "evidence" in x && x.evidence ? [x.evidence] : [],
    ),
    traces: results.map((x) => x.trace),
  };
}
function unavailable(
  tool: string,
  label: string,
  plan: { client: ReadOnlyMcp; skill: string },
  error: string,
): ToolTrace {
  return {
    tool,
    label,
    skill: plan.skill,
    endpoint: plan.client.endpoint,
    arguments: {},
    startedAt: new Date().toISOString(),
    durationMs: 0,
    status: "failed",
    error,
    evidenceId: null,
  };
}
