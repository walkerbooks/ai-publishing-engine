import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center px-4 py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
