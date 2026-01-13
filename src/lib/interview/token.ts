import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface InterviewSession {
  interviewId: string;
  candidateName: string;
  status: "scheduled" | "live" | "completed";
  templateVersionId: string;
}

export async function validateInterviewToken(
  token: string
): Promise<InterviewSession | null> {
  if (!token || token.length < 32) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();

  const { data: interview } = await adminClient
    .from("interviews")
    .select("id, candidate_name, status, template_version_id")
    .eq("access_token", token)
    .single();

  if (!interview) {
    return null;
  }

  return {
    interviewId: interview.id,
    candidateName: interview.candidate_name,
    status: interview.status as InterviewSession["status"],
    templateVersionId: interview.template_version_id,
  };
}


