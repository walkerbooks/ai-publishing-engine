import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "@/lib/log";

const log = getLogger("api/go/proxy");

function backendBase(): string {
  return process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8080";
}

function responseHeadersFromUpstream(res: Response, contentType: string): Headers {
  const out = new Headers();
  if (contentType) {
    out.set("Content-Type", contentType);
  }
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    for (const c of h.getSetCookie()) {
      out.append("Set-Cookie", c);
    }
  } else {
    const single = res.headers.get("set-cookie");
    if (single) out.append("Set-Cookie", single);
  }
  return out;
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
  let auth = req.headers.get("authorization");
  if (!auth) {
    const x = req.headers.get("x-access-token");
    if (x?.trim()) auth = `Bearer ${x.trim()}`;
  }
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
  const isBodyless =
    res.status === 204 || res.status === 205 || res.status === 304;
  const upstreamCt = res.headers.get("content-type");
  const outCt =
    upstreamCt ?? (isBodyless ? "" : "application/json");
  const outHeaders = responseHeadersFromUpstream(res, outCt);
  if (isBodyless) {
    return new NextResponse(null, {
      status: res.status,
      headers: outHeaders,
    });
  }
  if (res.body) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: outHeaders,
    });
  }
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: outHeaders });
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
