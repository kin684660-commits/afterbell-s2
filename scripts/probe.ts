import { parseRpc } from "../lib/mcp";
let session: string | null = null;
async function rpc(method: string, params: unknown) {
  const r = await fetch("https://agent.bitget.com/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(session ? { "Mcp-Session-Id": session } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  session = r.headers.get("mcp-session-id") || session;
  return parseRpc(await r.text());
}
async function main() {
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "afterbell", version: "0.1" },
  });
  console.log(
    JSON.stringify(
      await rpc("tools/call", {
        name: "do_query",
        arguments: {
          entry_id: "equity_price_quote",
          params: { symbol: "NVDA" },
        },
      }),
    ),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
