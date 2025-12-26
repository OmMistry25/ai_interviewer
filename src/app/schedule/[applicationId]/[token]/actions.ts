"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendInterviewScheduledEmail } from "@/lib/email/templates";
import crypto from "crypto";

interface ScheduleInterviewParams {
  applicationId: string;
  token: string;
  jobId: string;
  templateId: string | null;
  scheduledAt: string;
}

export async function scheduleInterview(
  params: ScheduleInterviewParams
): Promise<{ success: boolean; interviewUrl?: string; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Validate token
  const { data: application, error: appError } = await admin
    .from("applications")
    .select(`
      id,
      schedule_token,
      candidate:candidates(id, first_name, email),
      job:job_postings(title, org_id, template_id, organizations(name))
    `)
    .eq("id", params.applicationId)
    .eq("schedule_token", params.token)
    .single();

  if (appError || !application) {
    return { success: false, error: "Invalid scheduling link" };
  }

  const candidate = application.candidate as any;
  const job = application.job as any;

  // Get the published template version
  let templateVersionId: string | null = null;
  if (params.templateId) {
    const { data: version } = await admin
      .from("interview_template_versions")
      .select("id")
      .eq("template_id", params.templateId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    templateVersionId = version?.id || null;
  }

  if (!templateVersionId) {
    return { success: false, error: "No published interview template found for this job" };
  }

  // Generate interview access token
  const accessToken = crypto.randomBytes(32).toString("hex");

  // Create interview record
  const { data: interview, error: interviewError } = await admin
    .from("interviews")
    .insert({
      org_id: job.org_id,
      template_version_id: templateVersionId,
      candidate_name: `${candidate.first_name}`,
      status: "scheduled",
      access_token: accessToken,
      application_id: params.applicationId,
    })
    .select()
    .single();

  if (interviewError) {
    console.error("Interview creation error:", interviewError);
    return { success: false, error: "Failed to create interview" };
  }

  // Update application status
  await admin
    .from("applications")
    .update({
      status: "scheduled",
      scheduled_at: params.scheduledAt,
    })
    .eq("id", params.applicationId);

  // Generate interview URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const interviewUrl = `${baseUrl}/candidate/interview/${accessToken}`;

  // Send confirmation email
  await sendInterviewScheduledEmail({
    to: candidate.email,
    candidateName: candidate.first_name,
    jobTitle: job.title,
    companyName: job.organizations?.name || "Company",
    scheduledTime: new Date(params.scheduledAt),
    interviewUrl,
  });

  return { success: true, interviewUrl };
}

