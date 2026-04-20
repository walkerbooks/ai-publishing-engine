import { getAiAuthHeaders } from "@/lib/api/ai-auth-headers";
import { AI_PROXY } from "@/lib/api/paths";

export type GenerateCoverApiResponse = {
  file_path: string;
  image_base64?: string | null;
};

export type CoverVariantApiItem = {
  file_path: string;
  image_base64: string;
};

export type GenerateCoverVariantsApiResponse = {
  images: CoverVariantApiItem[];
};

export async function generateCoverVariantsForChat(
  prompt: string,
  outputBasename: string | null,
  count: number = 3,
): Promise<GenerateCoverVariantsApiResponse> {
  const res = await fetch(AI_PROXY.coverGenerateVariants, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAiAuthHeaders(),
    },
    body: JSON.stringify({
      prompt,
      count,
      output_basename: outputBasename ?? undefined,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Cover variants failed (${res.status})`);
  }
  return res.json() as Promise<GenerateCoverVariantsApiResponse>;
}

export async function generateCoverImageForChat(
  prompt: string,
  outputBasename?: string | null,
): Promise<GenerateCoverApiResponse> {
  const res = await fetch(AI_PROXY.coverGenerate, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAiAuthHeaders(),
    },
    body: JSON.stringify({
      prompt,
      output_basename: outputBasename ?? undefined,
      include_base64: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Cover generation failed (${res.status})`);
  }
  return res.json() as Promise<GenerateCoverApiResponse>;
}
