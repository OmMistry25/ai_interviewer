"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendDecisionEmail } from "@/lib/email/templates";
import { revalidatePath } from "next/cache";

export async function updateDecision(
  applicationId: string,
  decision: "accepted" | "rejected"
) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  // Get application details
  const { data: application } = await supabase
    .from("applications")
    .select(`
      id,
      candidate:candidates(first_name, email),
      job:job_postings(title, organizations(name))
    `)
    .eq("id", applicationId)
    .single();

  if (!application) {
    return { error: "Application not found" };
  }

  const candidate = application.candidate as any;
  const job = application.job as any;

  // Update application status
  await admin
    .from("applications")
    .update({ status: decision })
    .eq("id", applicationId);

  // Send decision email
  await sendDecisionEmail({
    to: candidate.email,
    candidateName: candidate.first_name,
    jobTitle: job.title,
    companyName: job.organizations?.name || "Company",
    decision,
  });

  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${applicationId}`);

  return { success: true };
}

