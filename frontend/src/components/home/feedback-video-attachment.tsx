"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Circle, Square, Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FEEDBACK_VIDEO_ACCEPT,
  FEEDBACK_VIDEO_MAX_BYTES,
  FEEDBACK_VIDEO_MAX_RECORDING_SEC,
  formatFeedbackVideoSize,
  validateFeedbackVideoFile,
} from "@/lib/feedback/video-limits";
import { cn } from "@/lib/utils/cn";

type Props = {
  video: File | null;
  onVideoChange: (file: File | null) => void;
  disabled?: boolean;
};

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function FeedbackVideoAttachment({ video, onVideoChange, disabled = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);

  const setVideoFile = useCallback(
    (file: File | null) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      if (file) {
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
      onVideoChange(file);
    },
    [onVideoChange],
  );

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function onUploadClick() {
    setLocalError(null);
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateFeedbackVideoFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setVideoFile(file);
  }

  function onRecorded(file: File) {
    const err = validateFeedbackVideoFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setVideoFile(file);
    setRecordOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onUploadClick}
          className="h-11 flex-1 rounded-xl border-dashed"
        >
          <Upload className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Upload video
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setLocalError(null);
            setRecordOpen(true);
          }}
          className="h-11 flex-1 rounded-xl border-dashed"
        >
          <Camera className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Record with camera
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={FEEDBACK_VIDEO_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={onFileSelected}
      />

      <p className="text-xs text-muted-foreground">
        Optional · MP4, WebM, or MOV · up to {formatFeedbackVideoSize(FEEDBACK_VIDEO_MAX_BYTES)}
      </p>

      {localError ? (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      ) : null}

      {video && previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
          <video
            src={previewUrl}
            controls
            playsInline
            className="max-h-56 w-full bg-black object-contain"
          />
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-sm dark:border-white/10">
            <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
              <Video className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{video.name}</span>
              <span className="shrink-0">({formatFeedbackVideoSize(video.size)})</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setLocalError(null);
                setVideoFile(null);
              }}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      ) : null}

      <FeedbackVideoRecorderDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onRecorded={onRecorded}
      />
    </div>
  );
}

type RecorderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (file: File) => void;
};

function FeedbackVideoRecorderDialog({ open, onOpenChange, onRecorded }: RecorderDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecorder = useCallback(() => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsedSec(0);
  }, [stopTimer]);

  const cleanup = useCallback(() => {
    resetRecorder();
    stopStream();
    setReady(false);
    setError(null);
  }, [resetRecorder, stopStream]);

  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setError(null);
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera recording isn't supported in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError("Could not access your camera or microphone. Check browser permissions and try again.");
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open, cleanup]);

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    stopTimer();
    setRecording(false);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      setError("Video recording isn't supported in this browser.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `feedback-recording-${Date.now()}.${ext}`, {
        type: blob.type || mimeType,
      });
      onRecorded(file);
    };

    recorder.start(250);
    setRecording(true);
    setElapsedSec(0);
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= FEEDBACK_VIDEO_MAX_RECORDING_SEC) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }

  const timeLabel = `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cleanup();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl gap-4">
        <DialogHeader>
          <DialogTitle>Record feedback video</DialogTitle>
          <DialogDescription>
            Show us the issue or idea on screen. Up to {FEEDBACK_VIDEO_MAX_RECORDING_SEC} seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border bg-black dark:border-white/10">
          <video ref={videoRef} muted playsInline className="aspect-video w-full bg-black object-cover" />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm tabular-nums text-muted-foreground">
            {recording ? `Recording ${timeLabel}` : ready ? "Camera ready" : "Starting camera…"}
          </p>
          <div className="flex gap-2">
            {!recording ? (
              <Button
                type="button"
                disabled={!ready || Boolean(error)}
                onClick={startRecording}
                className={cn(
                  "rounded-xl bg-walker-teal text-walker-charcoal hover:bg-walker-teal hover:brightness-110",
                )}
              >
                <Circle className="mr-2 h-4 w-4 fill-current" aria-hidden />
                Start recording
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopRecording} className="rounded-xl">
                <Square className="mr-2 h-4 w-4 fill-current" aria-hidden />
                Stop
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
