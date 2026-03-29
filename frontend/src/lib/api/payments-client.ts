import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("payments-client");

export type CreateCheckoutResponse = { checkout_url: string };

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
    await throwIfGoResponseFailed(res);
  }
  log.debug("createCheckout succeeded", { bookPublicId });
  return res.json() as Promise<CreateCheckoutResponse>;
}
