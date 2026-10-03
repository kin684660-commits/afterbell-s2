import type { Market } from "./types";
import { marketSession } from "./guardrails";
export function parseRpc(text: string) {
  if (text.trim().startsWith("{")) return JSON.parse(text);
  for (const line of text.split("\n"))
    if (line.startsWith("data:")) {
      const data = JSON.parse(line.slice(5).trim());
      if (data.result || data.error) return data;
    }
  throw new Error("Invalid MCP response");
}
export function unwrapData(raw: {
  structuredContent?: unknown;
  content?: { type: string; text?: string }[];
  isError?: boolean;
}) {
  if (raw.isError) throw new Error("Provider tool error");
  const body =
    raw.structuredContent ||
    JSON.parse(raw.content?.find((c) => c.type === "text")?.text || "null");
  if (!body || typeof body !== "object")
    throw new Error("Provider data missing");
  if ("success" in body && body.success !== true)
    throw new Error(
      `Provider returned unsuccessful data${"status_code" in body ? ` (HTTP ${body.status_code})` : ""}`,
    );
  return body;
}
export async function bitgetMarket(symbol: string): Promise<Market> {
  let session: string | null = null;
  let seq = 1;
  const endpoint = "https://agent.bitget.com/mcp";
  async function rpc(method: string, params: unknown) {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(session ? { "Mcp-Session-Id": session } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: seq++, method, params }),
    });
    session = res.headers.get("mcp-session-id") || session;
    if (!res.ok) throw new Error(`Bitget MCP HTTP ${res.status}`);
    const json = parseRpc(await res.text());
    if (json.error) throw new Error(String(json.error.message));
    return json.result;
  }
  try {
    await rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "afterbell", version: "0.1.0" },
    });
    const list = await rpc("tools/list", {});
    if (
      !list.tools.some((t: { name: string }) => t.name === "guide") ||
      !list.tools.some((t: { name: string }) => t.name === "do_query")
    )
      throw new Error("Unsupported data catalog");
    const catalog = await rpc("tools/call", {
      name: "guide",
      arguments: { category: "equity" },
    });
    const entries =
      catalog.structuredContent?.entries ||
      JSON.parse(
        catalog.content.find((c: { type: string }) => c.type === "text").text,
      ).entries;
    if (!entries.some((e: { id: string }) => e.id === "equity_price_quote"))
      throw new Error("Quote entry not discovered");
    const raw = await rpc("tools/call", {
      name: "do_query",
      arguments: { entry_id: "equity_price_quote", params: { symbol } },
    });
    unwrapData(raw);
    return {
      provider: "Bitget MCP · equity_price_quote",
      retrievedAt: new Date().toISOString(),
      status: "context-only",
      raw,
      warnings: [
        "Raw provider response; executable timestamp, spread, depth and token mapping have not been verified.",
      ],
      session: marketSession(),
    };
  } catch {
    return {
      provider: "Bitget MCP",
      retrievedAt: new Date().toISOString(),
      status: "unavailable",
      raw: null,
      warnings: [
        "Market provider unavailable or quote schema unsupported. No price or token mapping inferred.",
      ],
      session: marketSession(),
    };
  }
}
