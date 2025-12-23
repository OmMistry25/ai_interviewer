import { createSupabaseServerClient } from "./server";

export async function getCurrentOrg() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", membership.org_id)
    .single();

  return {
    orgId: membership.org_id as string,
    role: membership.role as "owner" | "admin" | "reviewer",
    name: org?.name ?? null,
  };
}

