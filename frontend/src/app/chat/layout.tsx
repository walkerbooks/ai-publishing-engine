import type { Viewport } from "next";
import { ChatViewportLock } from "./chat-viewport-lock";
import { ChatVisualViewportFrame } from "./chat-visual-viewport-frame";

/** Shrinks layout viewport on Android when the keyboard opens (pairs with visualViewport sync). */
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ChatViewportLock>
      <ChatVisualViewportFrame>{children}</ChatVisualViewportFrame>
    </ChatViewportLock>
  );
}
