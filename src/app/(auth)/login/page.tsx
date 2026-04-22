import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
};

function LoginFallback() {
  return (
    <div className="mt-7 space-y-4 animate-pulse">
      <div className="h-10 rounded bg-neutral-200" />
      <div className="h-10 rounded bg-neutral-200" />
      <div className="h-11 rounded bg-neutral-300" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="studio-panel mx-auto w-full max-w-md p-8 sm:p-9">
        <p className="studio-kicker">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          Log in
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Use your workspace credentials, or continue with demo login.
        </p>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
