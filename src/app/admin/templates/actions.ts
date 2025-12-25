"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";

export async function createTemplate(name: string) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const { data: template, error: templateError } = await supabase
    .from("interview_templates")
    .insert({ org_id: org.orgId, name })
    .select()
    .single();

  if (templateError) {
    return { error: templateError.message };
  }

  // Create initial draft version
  const { error: versionError } = await supabase
    .from("template_versions")
    .insert({
      template_id: template.id,
      version: 1,
      config: {
        system_prompt: "You are a professional interviewer.",
        voice: { voice_id: "alloy", speed: 1.0 },
        questions: [],
        policies: { max_followups_per_question: 1, min_answer_seconds: 5 },
      },
      status: "draft",
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
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("template_versions")
    .update({ config })
    .eq("id", versionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

export async function publishTemplateVersion(versionId: string) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  // Get the template_id for this version
  const { data: version } = await supabase
    .from("template_versions")
    .select("template_id")
    .eq("id", versionId)
    .single();

  if (!version) {
    return { error: "Version not found" };
  }

  // Unpublish any existing published versions
  await supabase
    .from("template_versions")
    .update({ status: "archived" })
    .eq("template_id", version.template_id)
    .eq("status", "published");

  // Publish this version
  const { error } = await supabase
    .from("template_versions")
    .update({ status: "published" })
    .eq("id", versionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/templates");
  return { success: true };
}

