/** Simulated streaming for preview when backend returns full markdown at once. */
export async function* chunkTextByParagraphs(
  text: string,
  delayMs = 45,
): AsyncGenerator<string> {
  const parts = text.split(/\n\n+/);
  for (let i = 0; i < parts.length; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    yield (i > 0 ? "\n\n" : "") + parts[i];
  }
}
