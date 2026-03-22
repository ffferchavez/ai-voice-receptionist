import Link from "next/link";

export const metadata = {
  title: "Create account · AI Voice Receptionist",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create your workspace
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Sign-up forms and organization bootstrap arrive in Phase 2.
      </p>
      <Link
        href="/"
        className="mt-8 text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
      >
        ← Back to home
      </Link>
    </div>
  );
}
