import { validateFeedbackVideoFile } from "@/lib/feedback/video-limits";

export type FeedbackCategory =
  | "general"
  | "product"
  | "bug"
  | "feature"
  | "other";

export type FeedbackPayload = {
  message: string;
  category: FeedbackCategory;
  name?: string;
  email?: string;
  video?: File | null;
};

async function readFeedbackError(res: Response): Promise<string> {
  let msg = `Request failed: ${res.status}`;
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) msg = j.error;
  } catch {
    const t = await res.text();
    if (t) msg = t;
  }
  return msg;
}

export async function submitFeedback(body: FeedbackPayload): Promise<void> {
  const video = body.video && body.video.size > 0 ? body.video : null;
  if (video) {
    const videoErr = validateFeedbackVideoFile(video);
    if (videoErr) throw new Error(videoErr);
  }

  const hasVideo = Boolean(video);
  const res = await fetch("/api/feedback", {
    method: "POST",
    credentials: "include",
    headers: hasVideo ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
    body: hasVideo
      ? (() => {
          const form = new FormData();
          form.append("message", body.message);
          form.append("category", body.category);
          if (body.name?.trim()) form.append("name", body.name.trim());
          if (body.email?.trim()) form.append("email", body.email.trim());
          form.append("video", video!);
          return form;
        })()
      : JSON.stringify({
          message: body.message,
          category: body.category,
          name: body.name,
          email: body.email,
        }),
  });

  if (!res.ok) {
    throw new Error(await readFeedbackError(res));
  }
}
