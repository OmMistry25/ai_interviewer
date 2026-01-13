import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "resumes";

/**
 * Upload a resume file to Supabase Storage
 */
export async function uploadResume(
  file: File,
  applicationId: string
): Promise<{ path: string; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Generate unique path
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${applicationId}/${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Resume upload error:", error);
    return { path: "", error: error.message };
  }

  return { path };
}

/**
 * Get a signed URL for a resume file
 */
export async function getResumeUrl(
  path: string,
  expiresIn = 3600
): Promise<{ url: string; error?: string }> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: "", error: error.message };
  }

  return { url: data.signedUrl };
}

/**
 * Delete a resume file
 */
export async function deleteResume(path: string): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    return { error: error.message };
  }

  return {};
}


