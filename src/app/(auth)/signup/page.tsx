import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create account · AI Voice Receptionist",
};

function SignupFallback() {
  return (
    <div className="mt-7 space-y-4 animate-pulse">
      <div className="h-10 rounded bg-neutral-200" />
      <div className="h-10 rounded bg-neutral-200" />
      <div className="h-10 rounded bg-neutral-200" />
      <div className="h-11 rounded bg-neutral-300" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="helion-panel mx-auto w-full max-w-md p-8 sm:p-9">
        <p className="helion-kicker">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          Create account
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Takes about a minute. No credit card.
        </p>

        <Suspense fallback={<SignupFallback />}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
