"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function createOrganization(formData: FormData): Promise<void> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    throw new Error("Organization name is required");
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Create organization (using admin client to bypass RLS)
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name: name.trim() })
    .select("id")
    .single();

  if (orgError) {
    throw new Error(orgError.message);
  }

  // Add user as owner (using admin client to bypass RLS)
  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    throw new Error(memberError.message);
  }

  redirect("/");
}

