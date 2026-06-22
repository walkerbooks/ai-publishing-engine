import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "@/lib/log";
import { validateFeedbackVideoFile } from "@/lib/feedback/video-limits";

const log = getLogger("api/feedback");

const CATEGORIES = new Set(["general", "product", "bug", "feature", "other"]);

function backendBase(): string {
  return process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8080";
}

type FeedbackPayload = {
  message: string;
  category: string;
  name?: string;
  email?: string;
  video?: File;
};

function parseFields(raw: {
  message?: string;
  category?: string;
  name?: string;
  email?: string;
  video?: File;
}) {
  const message = raw.message?.trim() ?? "";
  const category = raw.category?.trim() ?? "general";
  const name = raw.name?.trim() || undefined;
  const email = raw.email?.trim() || undefined;
  const video = raw.video && raw.video.size > 0 ? raw.video : undefined;

  if (message.length < 10) {
    return { error: "Please share at least 10 characters of feedback." as const };
  }
  if (message.length > 5000) {
    return { error: "Feedback must be 5,000 characters or fewer." as const };
  }
  if (!CATEGORIES.has(category)) {
    return { error: "Please choose a valid feedback category." as const };
  }
  if (email && !email.includes("@")) {
    return { error: "Please enter a valid email address." as const };
  }
  if (video) {
    const videoErr = validateFeedbackVideoFile(video);
    if (videoErr) return { error: videoErr as const };
  }

  return {
    payload: { message, category, name, email, video },
  };
}

async function parseRequest(req: NextRequest): Promise<FeedbackPayload | { error: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return { error: "Invalid form data." };
    }

    const videoEntry = form.get("video");
    const video = videoEntry instanceof File ? videoEntry : undefined;

    const parsed = parseFields({
      message: String(form.get("message") ?? ""),
      category: String(form.get("category") ?? ""),
      name: String(form.get("name") ?? "") || undefined,
      email: String(form.get("email") ?? "") || undefined,
      video,
    });

    if ("error" in parsed) return parsed;
    return parsed.payload;
  }

  let raw: Record<string, string | undefined>;
  try {
    raw = (await req.json()) as Record<string, string | undefined>;
  } catch {
    return { error: "Invalid request body." };
  }

  const parsed = parseFields(raw);
  if ("error" in parsed) return parsed;
  return parsed.payload;
}

function buildForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers({ Accept: "application/json" });
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

async function forwardToGoJson(req: NextRequest, payload: FeedbackPayload) {
  const headers = buildForwardHeaders(req);
  headers.set("Content-Type", "application/json");

  return fetch(`${backendBase()}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: payload.message,
      category: payload.category,
      name: payload.name,
      email: payload.email,
    }),
    cache: "no-store",
  });
}

async function forwardToGoMultipart(req: NextRequest, payload: FeedbackPayload) {
  const headers = buildForwardHeaders(req);
  const form = new FormData();
  form.append("message", payload.message);
  form.append("category", payload.category);
  if (payload.name) form.append("name", payload.name);
  if (payload.email) form.append("email", payload.email);
  if (payload.video) form.append("video", payload.video, payload.video.name);

  return fetch(`${backendBase()}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  });
}

export async function POST(req: NextRequest) {
  const parsed = await parseRequest(req);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed;

  try {
    const upstream = payload.video
      ? await forwardToGoMultipart(req, payload)
      : await forwardToGoJson(req, payload);

    if (upstream.ok) {
      const text = await upstream.text();
      return new NextResponse(text || JSON.stringify({ ok: true }), {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }
    if (upstream.status !== 404 && upstream.status !== 405 && upstream.status !== 501) {
      const text = await upstream.text();
      log.warning(`upstream feedback POST -> HTTP ${upstream.status}`, text);
      return new NextResponse(text || JSON.stringify({ error: "Could not save feedback." }), {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }
  } catch (e) {
    log.warning("upstream feedback unreachable; storing locally", e);
  }

  log.info("feedback received", {
    category: payload.category,
    hasName: Boolean(payload.name),
    hasEmail: Boolean(payload.email),
    hasVideo: Boolean(payload.video),
    messageLength: payload.message.length,
    videoSize: payload.video?.size ?? 0,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
