"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const WaitlistSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().min(1, "Location is required"),
});

export async function submitWaitlistApplication(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient();

  // Validate form data
  const parsed = WaitlistSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { first_name, last_name, email, phone, location } = parsed.data;

  // Check if already on waitlist
  const { data: existing } = await adminClient
    .from("waitlist_candidates")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    // Update existing entry
    const { error: updateError } = await adminClient
      .from("waitlist_candidates")
      .update({
        first_name,
        last_name,
        phone: phone || null,
        preferred_location: location,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[submitWaitlistApplication] Update error:", updateError);
      return { success: false, error: "Failed to update your information" };
    }

    // Handle resume upload if provided
    const resumeFile = formData.get("resume") as File | null;
    if (resumeFile && resumeFile.size > 0) {
      await handleResumeUpload(adminClient, existing.id, resumeFile);
    }

    return { success: true };
  }

  // Create new waitlist entry
  const { data: waitlistEntry, error: insertError } = await adminClient
    .from("waitlist_candidates")
    .insert({
      first_name,
      last_name,
      email,
      phone: phone || null,
      preferred_location: location,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[submitWaitlistApplication] Insert error:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "This email is already registered" };
    }
    return { success: false, error: "Failed to submit application" };
  }

  // Handle resume upload if provided
  const resumeFile = formData.get("resume") as File | null;
  if (resumeFile && resumeFile.size > 0 && waitlistEntry) {
    await handleResumeUpload(adminClient, waitlistEntry.id, resumeFile);
  }

  return { success: true };
}

async function handleResumeUpload(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  waitlistId: string,
  resumeFile: File
) {
  try {
    // Generate unique path
    const ext = resumeFile.name.split(".").pop() || "pdf";
    const path = `waitlist/${waitlistId}/${Date.now()}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("resumes")
      .upload(path, resumeFile, {
        contentType: resumeFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[handleResumeUpload] Upload error:", uploadError);
      return;
    }

    // Update waitlist entry with resume path
    await adminClient
      .from("waitlist_candidates")
      .update({
        resume_path: path,
        resume_original_name: resumeFile.name,
      })
      .eq("id", waitlistId);
  } catch (error) {
    console.error("[handleResumeUpload] Error:", error);
    // Don't fail the whole submission if resume upload fails
  }
}

