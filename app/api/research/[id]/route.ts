import { get } from "@/lib/store";
import { demoAccess } from "@/lib/access";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = demoAccess(request);
  const r = get(id, access.owner);
  return r
    ? Response.json(r, { headers: access.headers })
    : Response.json({ error: "Not found" }, { status: 404 });
}
