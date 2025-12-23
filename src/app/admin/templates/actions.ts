"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateTemplateConfig } from "@/lib/interview/validator";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";

const DEFAULT_CONFIG = {
  system_prompt: "You are a professional interviewer.",
  voice: { voice_id: "neutral", speed: 1.0 },
  questions: [
    {
      id: "intro",
      prompt: "Please introduce yourself.",
      followups: [],
    },
  ],
  policies: {
    max_followups_per_question: 1,
    min_answer_seconds: 6,
  },
};

export async function createTemplate(formData: FormData): Promise<void> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    throw new Error("Template name is required");
  }

  const org = await getCurrentOrg();
  if (!org) {
    throw new Error("No organization found");
  }

  const adminClient = createSupabaseAdminClient();

  // Create template
  const { data: template, error: templateError } = await adminClient
    .from("interview_templates")
    .insert({ name: name.trim(), org_id: org.orgId })
    .select("id")
    .single();

  if (templateError) {
    throw new Error(templateError.message);
  }

  // Create initial version
  const { error: versionError } = await adminClient
    .from("interview_template_versions")
    .insert({
      template_id: template.id,
      version: 1,
      config: DEFAULT_CONFIG,
    });

  if (versionError) {
    throw new Error(versionError.message);
  }

  revalidatePath("/admin/templates");
}

export async function updateTemplateVersion(
  versionId: string,
  config: unknown
): Promise<void> {
  const validatedConfig = validateTemplateConfig(config);

  const supabase = await createSupabaseServerClient();

  // Check if version is already published
  const { data: version } = await supabase
    .from("interview_template_versions")
    .select("published_at")
    .eq("id", versionId)
    .single();

  if (version?.published_at) {
    throw new Error("Cannot update a published version");
  }

  const { error } = await supabase
    .from("interview_template_versions")
    .update({ config: validatedConfig })
    .eq("id", versionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/templates");
}

export async function publishTemplateVersion(versionId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get the version to find template_id
  const { data: version, error: fetchError } = await supabase
    .from("interview_template_versions")
    .select("template_id, config, published_at")
    .eq("id", versionId)
    .single();

  if (fetchError || !version) {
    throw new Error("Version not found");
  }

  if (version.published_at) {
    throw new Error("Version is already published");
  }

  // Validate config before publishing
  validateTemplateConfig(version.config);

  const adminClient = createSupabaseAdminClient();

  // Set published_at
  const { error: publishError } = await adminClient
    .from("interview_template_versions")
    .update({ published_at: new Date().toISOString() })
    .eq("id", versionId);

  if (publishError) {
    throw new Error(publishError.message);
  }

  // Update template's active_version_id and status
  const { error: templateError } = await adminClient
    .from("interview_templates")
    .update({ active_version_id: versionId, status: "published" })
    .eq("id", version.template_id);

  if (templateError) {
    throw new Error(templateError.message);
  }

  revalidatePath("/admin/templates");
}

