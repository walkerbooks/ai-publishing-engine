import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { getLogger } from "@/lib/log";

const log = getLogger("payments-client");

export type CreateCheckoutResponse = { checkout_url: string };

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return t || `Request failed: ${res.status}`;
}

export async function createPayPalCheckout(
  bookPublicId: string,
  accessToken: string,
): Promise<CreateCheckoutResponse> {
  const url = `${GO_API_PREFIX}/v1/payments/checkout`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...goAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ book_public_id: bookPublicId }),
  });
  if (!res.ok) {
    log.warning(`createCheckout failed: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  log.debug("createCheckout succeeded", { bookPublicId });
  return res.json() as Promise<CreateCheckoutResponse>;
}
