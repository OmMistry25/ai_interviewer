"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { revalidatePath } from "next/cache";
import { createJobSchema, updateJobSchema } from "@/types/job";

export async function createJob(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const data = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    employment_type: formData.get("employment_type") || "full_time",
    hourly_rate_min: formData.get("hourly_rate_min")
      ? Number(formData.get("hourly_rate_min"))
      : undefined,
    hourly_rate_max: formData.get("hourly_rate_max")
      ? Number(formData.get("hourly_rate_max"))
      : undefined,
    template_id: formData.get("template_id") || undefined,
  };

  const parsed = createJobSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid data" };
  }

  // Get the published template version if template is selected
  let templateVersionId = null;
  if (parsed.data.template_id) {
    const { data: version } = await supabase
      .from("interview_template_versions")
      .select("id")
      .eq("template_id", parsed.data.template_id)
      .eq("status", "published")
      .single();
    templateVersionId = version?.id;
  }

  const { error } = await supabase.from("job_postings").insert({
    org_id: org.orgId,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    employment_type: parsed.data.employment_type,
    hourly_rate_min: parsed.data.hourly_rate_min,
    hourly_rate_max: parsed.data.hourly_rate_max,
    template_version_id: templateVersionId,
    status: "draft",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  return { success: true };
}

export async function updateJob(jobId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const data = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    employment_type: formData.get("employment_type") || undefined,
    hourly_rate_min: formData.get("hourly_rate_min")
      ? Number(formData.get("hourly_rate_min"))
      : undefined,
    hourly_rate_max: formData.get("hourly_rate_max")
      ? Number(formData.get("hourly_rate_max"))
      : undefined,
    status: formData.get("status") || undefined,
    template_id: formData.get("template_id") || undefined,
  };

  const parsed = updateJobSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid data" };
  }

  // Get the published template version if template is selected
  let templateVersionId = undefined;
  if (parsed.data.template_id) {
    const { data: version } = await supabase
      .from("interview_template_versions")
      .select("id")
      .eq("template_id", parsed.data.template_id)
      .eq("status", "published")
      .single();
    templateVersionId = version?.id;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  delete updateData.template_id;
  if (templateVersionId !== undefined) {
    updateData.template_version_id = templateVersionId;
  }

  const { error } = await supabase
    .from("job_postings")
    .update(updateData)
    .eq("id", jobId)
    .eq("org_id", org.orgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  return { success: true };
}

export async function publishJob(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("job_postings")
    .update({ status: "active" })
    .eq("id", jobId)
    .eq("org_id", org.orgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  return { success: true };
}

export async function deleteJob(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("job_postings")
    .delete()
    .eq("id", jobId)
    .eq("org_id", org.orgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  return { success: true };
}
