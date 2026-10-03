import { get } from "@/lib/store";
import { markdown } from "@/lib/export";
import { demoAccess } from "@/lib/access";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = demoAccess(request);
  const r = get(id, access.owner);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  const json = new URL(request.url).searchParams.get("format") === "json";
  return new Response(json ? JSON.stringify(r, null, 2) : markdown(r), {
    headers: {
      ...access.headers,
      "Content-Type": json
        ? "application/json"
        : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="afterbell-${r.id}.${json ? "json" : "md"}"`,
    },
  });
}
