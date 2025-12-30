"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  return { success: true };
}

