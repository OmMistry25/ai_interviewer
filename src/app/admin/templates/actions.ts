"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";

export async function createTemplate(name: string) {
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  // Use admin client to bypass RLS for creating templates
  const supabase = createSupabaseAdminClient();

  const { data: template, error: templateError } = await supabase
    .from("interview_templates")
    .insert({ org_id: org.orgId, name })
    .select()
    .single();

  if (templateError) {
    return { error: templateError.message };
  }

  // Create initial draft version (published_at = null means draft)
  const { error: versionError } = await supabase
    .from("interview_template_versions")
    .insert({
      template_id: template.id,
      version: 1,
      config: {
        system_prompt: "You are a professional interviewer.",
        voice: { voice_id: "alloy", speed: 1.0 },
        questions: [],
        policies: { max_followups_per_question: 1, min_answer_seconds: 5 },
      },
    });

  if (versionError) {
    return { error: versionError.message };
  }

  revalidatePath("/admin/templates");
  return { templateId: template.id };
}

export async function updateTemplateVersion(
  versionId: string,
  config: Record<string, unknown>
) {
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("interview_template_versions")
    .update({ config })
    .eq("id", versionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function publishTemplateVersion(versionId: string) {
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const supabase = createSupabaseAdminClient();

  // Get the template_id for this version
  const { data: version } = await supabase
    .from("interview_template_versions")
    .select("template_id")
    .eq("id", versionId)
    .single();

  if (!version) {
    return { error: "Version not found" };
  }

  // Unpublish any existing published versions (set published_at to null)
  await supabase
    .from("interview_template_versions")
    .update({ published_at: null })
    .eq("template_id", version.template_id)
    .not("published_at", "is", null);

  // Publish this version (set published_at to now)
  const { error } = await supabase
    .from("interview_template_versions")
    .update({ published_at: new Date().toISOString() })
    .eq("id", versionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

