"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function createInterview(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const jobId = formData.get("jobId") as string;
  const templateId = formData.get("templateId") as string;
  const candidateName = formData.get("candidateName") as string;
  const candidateEmail = formData.get("candidateEmail") as string;

  if (!jobId || !templateId || !candidateName || !candidateEmail) {
    return { error: "All fields are required" };
  }

  // Parse candidate name into first/last
  const nameParts = candidateName.trim().split(/\s+/);
  const firstName = nameParts[0] || candidateName;
  const lastName = nameParts.slice(1).join(" ") || "";

  // Get the published version of the template
  const { data: version } = await supabase
    .from("interview_template_versions")
    .select("id")
    .eq("template_id", templateId)
    .not("published_at", "is", null)
    .single();

  if (!version) {
    return { error: "No published version found for this template" };
  }

  // 1. Create or find/update candidate by email
  let candidateId: string;
  
  const { data: existingCandidate } = await adminClient
    .from("candidates")
    .select("id")
    .eq("email", candidateEmail.toLowerCase())
    .single();

  if (existingCandidate) {
    // Update existing candidate's name to the new one
    await adminClient
      .from("candidates")
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", existingCandidate.id);
    
    candidateId = existingCandidate.id;
  } else {
    const { data: newCandidate, error: candidateError } = await adminClient
      .from("candidates")
      .insert({
        email: candidateEmail.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
      })
      .select("id")
      .single();

    if (candidateError || !newCandidate) {
      return { error: "Failed to create candidate: " + (candidateError?.message || "Unknown error") };
    }
    candidateId = newCandidate.id;
  }

  // 2. Create application
  const scheduleToken = crypto.randomBytes(32).toString("hex");
  
  const { data: application, error: appError } = await adminClient
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      status: "scheduled",
      schedule_token: scheduleToken,
      scheduled_at: new Date().toISOString(), // Scheduled for now
    })
    .select("id")
    .single();

  if (appError || !application) {
    // Might fail if duplicate application exists
    if (appError?.code === "23505") {
      return { error: "This candidate already has an application for this job" };
    }
    return { error: "Failed to create application: " + (appError?.message || "Unknown error") };
  }

  // 3. Create interview linked to the application
  const interviewToken = crypto.randomBytes(32).toString("hex");

  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .insert({
      org_id: org.orgId,
      template_version_id: version.id,
      candidate_name: candidateName,
      candidate_email: candidateEmail.toLowerCase(),
      access_token: interviewToken,
      status: "scheduled",
      application_id: application.id,
    })
    .select()
    .single();

  if (interviewError || !interview) {
    return { error: "Failed to create interview: " + (interviewError?.message || "Unknown error") };
  }

  revalidatePath("/admin/interviews");
  revalidatePath("/admin/candidates");
  
  return { 
    success: true, 
    interviewId: interview.id,
    token: interview.access_token,
  };
}
