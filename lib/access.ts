import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
export function demoAccess(request: Request) {
  if (process.env.AFTERBELL_PUBLIC_DEMO !== "1")
    return {
      owner: "__local__",
      headers: { "Cache-Control": "no-store" } as Record<string, string>,
    };
  const secret = process.env.AFTERBELL_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw Error("Public demo session secret not configured");
  const sign = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("afterbell-session="))
    ?.slice(18);
  let owner = "",
    payload = "";
  if (cookie) {
    const parts = cookie.split(".");
    if (
      parts.length === 3 &&
      /^[0-9a-f-]{36}$/.test(parts[0]) &&
      /^\d+$/.test(parts[1]) &&
      /^[0-9a-f]{64}$/.test(parts[2])
    ) {
      payload = parts.slice(0, 2).join(".");
      if (
        Number(parts[1]) > Date.now() &&
        timingSafeEqual(Buffer.from(sign(payload)), Buffer.from(parts[2]))
      )
        owner = parts[0];
    }
  }
  if (!owner) {
    owner = randomUUID();
    payload = `${owner}.${Date.now() + 7 * 86400000}`;
  }
  return {
    owner,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `afterbell-session=${payload}.${sign(payload)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https" ? "; Secure" : ""}`,
    } as Record<string, string>,
  };
}
let active = 0,
  day = "",
  total = 0;
const last = new Map<string, number>();
export function reserveResearch(owner: string) {
  if (process.env.AFTERBELL_PUBLIC_DEMO !== "1")
    return { release: () => {}, error: null };
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    total = 0;
    last.clear();
  }
  if (active >= 2)
    return {
      release: () => {},
      error: "演示正在处理研究，请稍后再试 / Demo busy",
    };
  if (Date.now() - (last.get(owner) || 0) < 60000)
    return { release: () => {}, error: "请等待一分钟后重试 / Wait one minute" };
  const limit = Number(process.env.AFTERBELL_MAX_DAILY_RESEARCH || 20);
  if (!Number.isInteger(limit) || limit < 1 || total >= limit)
    return {
      release: () => {},
      error: "今日演示研究额度已用完 / Daily demo quota reached",
    };
  total++;
  active++;
  last.set(owner, Date.now());
  let released = false;
  return {
    error: null,
    release: () => {
      if (!released) {
        active--;
        released = true;
      }
    },
  };
}
