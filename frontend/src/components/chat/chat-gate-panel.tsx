"use client";

import { Button } from "@/components/ui/button";

type Props = {
  awaitingGate: null | "outline" | "preview" | "full";
  onProceedToOutline: () => void;
  onChangeRequirements: () => void;
  onProceedToPreview: () => void;
  onChangeOutline: () => void;
  onUnlockFull: () => void;
  onChangePreview: () => void;
};

export function ChatGatePanel({
  awaitingGate,
  onProceedToOutline,
  onChangeRequirements,
  onProceedToPreview,
  onChangeOutline,
  onUnlockFull,
  onChangePreview,
}: Props) {
  if (!awaitingGate) return null;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {awaitingGate === "outline" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onProceedToOutline}>Proceed to outline</Button>
          <Button variant="outline" onClick={onChangeRequirements}>
            Change requirements
          </Button>
        </div>
      ) : null}

      {awaitingGate === "preview" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onProceedToPreview}>Proceed to preview</Button>
          <Button variant="outline" onClick={onChangeOutline}>
            Change outline
          </Button>
        </div>
      ) : null}

      {awaitingGate === "full" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onUnlockFull}>Unlock full book (mock)</Button>
          <Button variant="outline" onClick={onChangePreview}>
            Change preview
          </Button>
        </div>
      ) : null}
    </div>
  );
}

