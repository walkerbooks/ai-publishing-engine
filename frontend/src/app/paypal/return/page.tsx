import { Suspense } from "react";
import { PayPalReturnClient } from "./paypal-return-client";

export default function PayPalReturnPage() {
  return (
    <Suspense fallback={null}>
      <PayPalReturnClient />
    </Suspense>
  );
}
