"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyFormSchema } from "@/types/candidate";
import crypto from "crypto";

export async function submitApplication(
  jobId: string,
  formData: FormData
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Validate form data
  const rawData = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
  };

  const parsed = applyFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify job exists and is active
  const { data: job, error: jobError } = await admin
    .from("job_postings")
    .select("id, org_id, title")
    .eq("id", jobId)
    .eq("status", "active")
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job posting not found or not accepting applications" };
  }

  // Check if candidate already exists
  let candidateId: string;
  const { data: existingCandidate } = await admin
    .from("candidates")
    .select("id")
    .eq("email", parsed.data.email)
    .single();

  if (existingCandidate) {
    candidateId = existingCandidate.id;

    // Check if already applied to this job
    const { data: existingApp } = await admin
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single();

    if (existingApp) {
      return { success: false, error: "You have already applied to this position" };
    }
  } else {
    // Create new candidate
    const { data: newCandidate, error: candidateError } = await admin
      .from("candidates")
      .insert({
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      })
      .select()
      .single();

    if (candidateError) {
      console.error("Candidate creation error:", candidateError);
      return { success: false, error: "Failed to create candidate profile" };
    }

    candidateId = newCandidate.id;
  }

  // Generate schedule token
  const scheduleToken = crypto.randomBytes(32).toString("hex");

  // Create application
  const { data: application, error: appError } = await admin
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
      schedule_token: scheduleToken,
      status: "applied",
    })
    .select()
    .single();

  if (appError) {
    console.error("Application creation error:", appError);
    return { success: false, error: "Failed to submit application" };
  }

  // Send scheduling email in background
  sendSchedulingEmail(application.id, parsed.data, job).catch(console.error);

  return { success: true, applicationId: application.id };
}

async function sendSchedulingEmail(
  applicationId: string,
  candidate: { first_name: string; last_name: string; email: string },
  job: { title: string; org_id: string }
) {
  const { sendApplicationReceivedEmail } = await import("@/lib/email/templates");
  const admin = createSupabaseAdminClient();

  // Get org name
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", job.org_id)
    .single();

  // Get schedule token
  const { data: app } = await admin
    .from("applications")
    .select("schedule_token")
    .eq("id", applicationId)
    .single();

  if (!app?.schedule_token) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const scheduleUrl = `${baseUrl}/schedule/${applicationId}/${app.schedule_token}`;

  await sendApplicationReceivedEmail({
    to: candidate.email,
    candidateName: candidate.first_name,
    jobTitle: job.title,
    companyName: org?.name || "Company",
    scheduleUrl,
  });
}

export async function uploadApplicationResume(
  applicationId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const file = formData.get("resume") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Please upload a PDF or Word document" };
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File size must be less than 10MB" };
  }

  // Upload to storage
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${applicationId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Resume upload error:", uploadError);
    return { success: false, error: "Failed to upload resume" };
  }

  // Update application with resume path
  const { error: updateError } = await admin
    .from("applications")
    .update({
      resume_path: path,
      resume_original_name: file.name,
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("Application update error:", updateError);
    return { success: false, error: "Failed to save resume reference" };
  }

  // Trigger resume analysis in background (don't block the response)
  triggerResumeAnalysis(applicationId).catch(console.error);

  return { success: true };
}

async function triggerResumeAnalysis(applicationId: string) {
  // Import dynamically to avoid circular deps
  const { analyzeApplicationResume } = await import("@/lib/resume/parser");
  await analyzeApplicationResume(applicationId);
}

