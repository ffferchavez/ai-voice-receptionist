import Link from "next/link";

export const metadata = {
  title: "Sign-in link expired",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="studio-panel p-8">
        <h1 className="text-xl font-semibold text-neutral-950">
          Could not complete sign-in
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          The link may have expired or already been used. Request a new one from
          the sign-in page or try logging in with your password.
        </p>
        <Link
          href="/login"
          className="studio-btn-primary mt-6 inline-flex w-full items-center justify-center"
        >
          Back to log in
        </Link>
      </div>
    </div>
  );
}
