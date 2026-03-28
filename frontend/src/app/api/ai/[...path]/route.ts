import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkAiRateLimit } from "@/lib/server/ai-rate-limit";
import { getLogger } from "@/lib/log";

export const runtime = "nodejs";

const log = getLogger("api/ai/proxy");

function upstreamBase(): string {
  return process.env.AI_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
}

function anonRpm(): number {
  const n = Number(process.env.AI_PROXY_ANON_RPM);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function parseBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  return m?.[1] ?? null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function jsonResponse(obj: unknown, status: number, extraHeaders?: HeadersInit) {
  return new NextResponse(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

async function forward(
  req: NextRequest,
  pathParts: string[],
  method: "GET" | "POST",
) {
  const bearer = parseBearer(req.headers.get("authorization"));
  const ip = getClientIp(req);

  const rateKey = bearer ? `u:${hashToken(bearer)}` : `ip:${ip}`;
  const { ok, retryAfterSec } = bearer
    ? checkAiRateLimit(rateKey)
    : checkAiRateLimit(rateKey, { maxPerWindow: anonRpm() });

  if (!ok) {
    return jsonResponse(
      { error: "Too many AI requests. Try again shortly." },
      429,
      { "Retry-After": String(retryAfterSec) },
    );
  }

  const sub = pathParts.join("/");
  const targetUrl = new URL(`${upstreamBase()}/api/${sub}`);
  if (method === "GET") {
    const u = new URL(req.url);
    targetUrl.search = u.search;
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (bearer) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }
  const incomingCt = req.headers.get("content-type");
  if (incomingCt) headers.set("Content-Type", incomingCt);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };
  if (method === "POST") {
    init.body = await req.text();
    if (!incomingCt) {
      headers.set("Content-Type", "application/json");
    }
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, init);
  } catch (e) {
    log.error(`upstream fetch failed: ${method} /api/${sub}`, e);
    return jsonResponse({ error: "AI service unreachable" }, 502);
  }
  if (res.status >= 400) {
    log.warning(`upstream ${method} /api/${sub} -> HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "application/json";
  if (res.body) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: { "Content-Type": ct },
    });
  }
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": ct } });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path ?? [], "GET");
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path ?? [], "POST");
}
