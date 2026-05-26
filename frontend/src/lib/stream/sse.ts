export type SseEvent = {
  event: string;
  data: any;
};

function parseBlock(block: string): SseEvent | null {
  const lines = block.split("\n").map((l) => l.trimEnd());
  let event = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (!event || dataLines.length === 0) return null;
  const dataRaw = dataLines.join("\n");
  const data = dataRaw ? JSON.parse(dataRaw) : null;
  return { event, data };
}

export function drainSseBuffer(
  buffer: string,
): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx === -1) break;
    const block = rest.slice(0, idx).trim();
    rest = rest.slice(idx + 2);
    if (!block) continue;
    const e = parseBlock(block);
    if (e) events.push(e);
  }
  return { events, rest };
}

