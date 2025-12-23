"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";

export async function createInterview(formData: FormData): Promise<{ accessToken: string } | { error: string }> {
  const candidateName = formData.get("candidateName") as string;
  const candidateEmail = formData.get("candidateEmail") as string;
  const templateId = formData.get("templateId") as string;

  if (!candidateName?.trim()) {
    return { error: "Candidate name is required" };
  }
  if (!templateId) {
    return { error: "Template is required" };
  }

  const org = await getCurrentOrg();
  if (!org) {
    return { error: "No organization found" };
  }

  const adminClient = createSupabaseAdminClient();

  // Get the active version of the template
  const { data: template } = await adminClient
    .from("interview_templates")
    .select("active_version_id")
    .eq("id", templateId)
    .eq("org_id", org.orgId)
    .single();

  if (!template?.active_version_id) {
    return { error: "Template has no published version" };
  }

  // Create interview
  const { data: interview, error } = await adminClient
    .from("interviews")
    .insert({
      org_id: org.orgId,
      template_version_id: template.active_version_id,
      candidate_name: candidateName.trim(),
      candidate_email: candidateEmail?.trim() || null,
    })
    .select("id, access_token")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/interviews");
  
  return { accessToken: interview.access_token };
}

