import { parseRpc, unwrapData } from "./mcp";
export class ReadOnlyMcp {
  private session: string | null = null;
  private sequence = 0;
  constructor(
    readonly endpoint: string,
    readonly timeoutMs = 18000,
  ) {}
  async request(method: string, params: unknown): Promise<any> {
    const r = await fetch(this.endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(this.session ? { "Mcp-Session-Id": this.session } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.sequence,
        method,
        params,
      }),
    });
    this.session = r.headers.get("mcp-session-id") || this.session;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const result = parseRpc(await r.text());
    if (result.error) throw new Error("MCP protocol error");
    return result.result;
  }
  async connect() {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "afterbell", version: "0.2.0" },
    });
    return this.request("tools/list", {});
  }
  async call(name: string, args: Record<string, unknown>) {
    return unwrapData(
      await this.request("tools/call", { name, arguments: args }),
    );
  }
}
