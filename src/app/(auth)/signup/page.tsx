import Link from "next/link";

export const metadata = {
  title: "Create account · AI Voice Receptionist",
};

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

        <form className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-neutral-900">
              Your name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Alex Rivera"
              className="helion-input"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-neutral-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="helion-input"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-neutral-900"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="helion-input"
            />
            <p className="text-xs text-neutral-500">At least 8 characters.</p>
          </div>
          <button
            type="button"
            className="helion-btn-dark mt-1 w-full"
          >
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>
        </p>
        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link href="/" className="underline underline-offset-2">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
