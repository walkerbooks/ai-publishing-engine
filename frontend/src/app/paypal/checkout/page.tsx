import { Suspense } from "react";
import { PayPalCheckoutClient } from "./paypal-checkout-client";

export default function PayPalCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <PayPalCheckoutClient />
    </Suspense>
  );
}
