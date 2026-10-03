import { Input } from "@/lib/types";
import { research } from "@/lib/research";
import { recent } from "@/lib/store";
import { demoAccess, reserveResearch } from "@/lib/access";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    new URL(request.headers.get("origin")!).host !== request.headers.get("host")
  )
    return Response.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  try {
    const access = demoAccess(request);
    const raw = await request.text();
    if (raw.length > 5000)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const input = Input.safeParse(JSON.parse(raw));
    if (!input.success)
      return Response.json(
        { error: "Invalid research request" },
        { status: 400 },
      );
    if (input.data.mode !== "live")
      return Response.json(
        { error: "Demo supports actual live data only" },
        { status: 400, headers: access.headers },
      );
    const reservation = reserveResearch(access.owner);
    if (reservation.error)
      return Response.json(
        { error: reservation.error },
        { status: 429, headers: { ...access.headers, "Retry-After": "60" } },
      );
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          void research(
            input.data,
            (run) => {
              try {
                controller.enqueue(encoder.encode(JSON.stringify(run) + "\n"));
              } catch {}
            },
            access.owner,
          )
            .then(() => controller.close())
            .catch(() => {
              try {
                controller.close();
              } catch {}
            })
            .finally(reservation.release);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
          ...access.headers,
        },
      });
    }
    try {
      return Response.json(
        await research(input.data, undefined, access.owner),
        { headers: access.headers },
      );
    } finally {
      reservation.release();
    }
  } catch {
    return Response.json({ error: "Research request failed" }, { status: 500 });
  }
}
export async function GET(request: Request) {
  try {
    const access = demoAccess(request);
    return Response.json(recent(access.owner), { headers: access.headers });
  } catch {
    return Response.json({ error: "Demo unavailable" }, { status: 503 });
  }
}
