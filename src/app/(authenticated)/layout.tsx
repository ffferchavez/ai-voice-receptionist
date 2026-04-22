import { AppShell } from "@/components/app/app-shell";
import { ensureDefaultOrganization } from "@/lib/organizations/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  displayNameFromUser,
  initialsFromDisplayName,
} from "@/lib/user-display";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureDefaultOrganization(supabase, user);

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = displayNameFromUser(
    profile?.display_name,
    user.email,
  );
  const initials = initialsFromDisplayName(displayName);

  return (
    <AppShell displayName={displayName} initials={initials}>
      {children}
    </AppShell>
  );
}
