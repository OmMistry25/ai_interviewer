"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function createInterview(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const templateId = formData.get("templateId") as string;
  const candidateName = formData.get("candidateName") as string;
  const candidateEmail = formData.get("candidateEmail") as string;

  if (!templateId || !candidateName || !candidateEmail) {
    return { error: "All fields are required" };
  }

  // Get the published version of the template
  const { data: version } = await supabase
    .from("interview_template_versions")
    .select("id")
    .eq("template_id", templateId)
    .eq("status", "published")
    .single();

  if (!version) {
    return { error: "No published version found for this template" };
  }

  // Generate unique token for candidate link
  const token = crypto.randomBytes(32).toString("hex");

  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      org_id: org.orgId,
      template_version_id: version.id,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      token,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/interviews");
  return { 
    success: true, 
    interviewId: interview.id,
    token: interview.token,
  };
}
