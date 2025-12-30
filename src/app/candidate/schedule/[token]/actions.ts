"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendProfileLinkEmail } from "@/lib/email/templates";
import { z } from "zod";

const AvailabilitySchema = z.object({
  monday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  tuesday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  wednesday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  thursday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  friday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  saturday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
  sunday: z.array(z.enum(["morning", "afternoon", "evening", "night"])),
});

type Availability = z.infer<typeof AvailabilitySchema>;

export async function submitScheduleAvailability(
  applicationId: string,
  availability: Availability
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient();

  // Validate availability
  const parsed = AvailabilitySchema.safeParse(availability);
  if (!parsed.success) {
    return { success: false, error: "Invalid availability data" };
  }

  // Check that at least one shift is selected
  const totalShifts = Object.values(parsed.data).reduce(
    (sum, shifts) => sum + shifts.length,
    0
  );
  if (totalShifts === 0) {
    return { success: false, error: "Please select at least one shift" };
  }

  // Update application with availability
  // Status becomes "interviewed" - they've completed interview + submitted availability
  const { error: updateError } = await adminClient
    .from("applications")
    .update({
      schedule_availability: parsed.data,
      schedule_submitted_at: new Date().toISOString(),
      status: "interviewed",
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("[submitScheduleAvailability] Update error:", updateError);
    return { success: false, error: "Failed to save availability" };
  }

  // Send profile link email in background
  sendProfileEmail(applicationId).catch(console.error);

  return { success: true };
}

async function sendProfileEmail(applicationId: string) {
  const adminClient = createSupabaseAdminClient();

  // Get application with related data
  const { data: application } = await adminClient
    .from("applications")
    .select(`
      id,
      candidates (first_name, email),
      job_postings (title, organizations (name)),
      interviews (access_token)
    `)
    .eq("id", applicationId)
    .single();

  if (!application) return;

  const candidate = application.candidates as unknown as { first_name: string; email: string } | null;
  const job = application.job_postings as unknown as { title: string; organizations: { name: string } } | null;
  const interviews = application.interviews as unknown as Array<{ access_token: string }> | null;
  const interview = interviews?.[0];

  if (!candidate?.email || !interview?.access_token) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const profileUrl = `${baseUrl}/candidate/profile/${interview.access_token}`;

  await sendProfileLinkEmail({
    to: candidate.email,
    candidateName: candidate.first_name,
    jobTitle: job?.title || "Position",
    companyName: job?.organizations?.name || "Company",
    profileUrl,
  });
}

