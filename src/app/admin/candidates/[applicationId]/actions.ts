"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";
import { sendDecisionEmail } from "@/lib/email/templates";

export async function makeDecision(
  applicationId: string,
  decision: "accepted" | "rejected"
) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  // Get application with candidate and job info
  const { data: application } = await supabase
    .from("applications")
    .select(`
      id,
      candidates (
        first_name,
        email
      ),
      job_postings!inner (
        title,
        org_id
      )
    `)
    .eq("id", applicationId)
    .eq("job_postings.org_id", org.orgId)
    .single();

  if (!application) {
    return { error: "Application not found" };
  }

  const candidate = application.candidates as unknown as {
    first_name: string;
    email: string;
  } | null;
  const job = application.job_postings as unknown as { title: string } | null;

  // Update application status
  const { error } = await supabase
    .from("applications")
    .update({ status: decision })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  // Send decision email
  if (candidate && job) {
    await sendDecisionEmail({
      to: candidate.email,
      candidateName: candidate.first_name,
      jobTitle: job.title,
      companyName: org.name || "Our Company",
      decision,
    });
  }

  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${applicationId}`);
  return { success: true };
}
