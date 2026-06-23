export const FEEDBACK_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const FEEDBACK_VIDEO_MAX_RECORDING_SEC = 120;

export const FEEDBACK_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov";

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

export function formatFeedbackVideoSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFeedbackVideoFile(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.has(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return "Please choose an MP4, WebM, MOV, or AVI video.";
  }
  if (file.size > FEEDBACK_VIDEO_MAX_BYTES) {
    return `Video must be ${formatFeedbackVideoSize(FEEDBACK_VIDEO_MAX_BYTES)} or smaller.`;
  }
  if (file.size <= 0) {
    return "That video file looks empty. Try another clip.";
  }
  return null;
}
