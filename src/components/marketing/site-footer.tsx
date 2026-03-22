export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50/80 py-10 dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
        <p>
          © {new Date().getFullYear()} Helion City · Helion Voices · AI Voice
          Receptionist
        </p>
        <p className="text-zinc-500 dark:text-zinc-500">
          Inbound calls · Webhook events · Transcripts & leads
        </p>
      </div>
    </footer>
  );
}
