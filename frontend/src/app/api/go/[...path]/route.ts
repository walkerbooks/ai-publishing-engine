import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "@/lib/log";

const log = getLogger("api/go/proxy");

function backendBase(): string {
  return process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8080";
}

async function forward(
  req: NextRequest,
  pathParts: string[],
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
) {
  const sub = pathParts.join("/");
  const targetUrl = new URL(`${backendBase()}/api/${sub}`);
  if (method === "GET" || method === "DELETE") {
    const u = new URL(req.url);
    targetUrl.search = u.search;
  }

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    init.body = await req.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, init);
  } catch (e) {
    log.error(`upstream fetch failed: ${method} /api/${sub}`, e);
    return new NextResponse(JSON.stringify({ error: "upstream unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (res.status >= 400) {
    log.warning(`upstream ${method} /api/${sub} -> HTTP ${res.status}`);
  }
  const outCt = res.headers.get("content-type") || "application/json";
  if (res.body) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: { "Content-Type": outCt },
    });
  }
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": outCt } });
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

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path ?? [], "PATCH");
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path ?? [], "PUT");
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(req, path ?? [], "DELETE");
}
