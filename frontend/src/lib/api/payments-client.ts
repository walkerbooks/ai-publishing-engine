import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";
import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";

const log = getLogger("payments-client");

export type CreateCheckoutResponse = { checkout_url: string };

export type CaptureCheckoutResponse = { captured: boolean };

export type CreatePayPalCheckoutOptions = {
  packageTier?: FullBookPackageTier;
  includeCover?: boolean;
};

export async function createPayPalCheckout(
  bookPublicId: string,
  accessToken: string,
  opts?: CreatePayPalCheckoutOptions,
): Promise<CreateCheckoutResponse> {
  const url = `${GO_API_PREFIX}/v1/payments/checkout`;
  const body: Record<string, unknown> = { book_public_id: bookPublicId };
  if (opts?.packageTier) body.package_tier = opts.packageTier;
  if (opts?.includeCover) body.include_cover = true;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...goAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    log.warning(`createCheckout failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("createCheckout succeeded", { bookPublicId });
  return res.json() as Promise<CreateCheckoutResponse>;
}

/** Capture an approved PayPal order (return URL `token` query param). */
export async function capturePayPalOrder(
  orderId: string,
  accessToken: string,
): Promise<CaptureCheckoutResponse> {
  const url = `${GO_API_PREFIX}/v1/payments/capture`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...goAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) {
    log.warning(`captureCheckout failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("captureCheckout succeeded", { orderId });
  return res.json() as Promise<CaptureCheckoutResponse>;
}
