import { NextRequest, NextResponse } from "next/server";

function upstreamBase(): string {
  return process.env.AI_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
}

async function forward(
  req: NextRequest,
  pathParts: string[],
  method: "GET" | "POST",
) {
  const sub = pathParts.join("/");
  const targetUrl = new URL(`${upstreamBase()}/api/${sub}`);
  if (method === "GET") {
    const u = new URL(req.url);
    targetUrl.search = u.search;
  }
  const init: RequestInit = {
    method,
    cache: "no-store",
    headers: { Accept: "application/json" },
  };
  if (method === "POST") {
    const body = await req.text();
    init.body = body;
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    };
  }
  const res = await fetch(targetUrl, init);
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
