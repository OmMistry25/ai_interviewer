"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { createJobSchema, updateJobSchema } from "@/types/job";
import { revalidatePath } from "next/cache";

export async function createJob(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { error: "Not authenticated or no organization" };
  }

  const rawData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    location: formData.get("location") as string,
    employment_type: formData.get("employment_type") as string,
    hourly_rate_min: formData.get("hourly_rate_min") 
      ? parseFloat(formData.get("hourly_rate_min") as string) 
      : undefined,
    hourly_rate_max: formData.get("hourly_rate_max")
      ? parseFloat(formData.get("hourly_rate_max") as string)
      : undefined,
    template_id: formData.get("template_id") as string || undefined,
    status: "draft",
  };

  const parsed = createJobSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("job_postings")
    .insert({
      ...parsed.data,
      org_id: org.orgId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  return { data };
}

export async function updateJob(jobId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { error: "Not authenticated or no organization" };
  }

  const rawData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    location: formData.get("location") as string,
    employment_type: formData.get("employment_type") as string,
    hourly_rate_min: formData.get("hourly_rate_min")
      ? parseFloat(formData.get("hourly_rate_min") as string)
      : undefined,
    hourly_rate_max: formData.get("hourly_rate_max")
      ? parseFloat(formData.get("hourly_rate_max") as string)
      : undefined,
    template_id: formData.get("template_id") as string || undefined,
    status: formData.get("status") as string,
  };

  const parsed = updateJobSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("job_postings")
    .update(parsed.data)
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  return { data };
}

export async function deleteJob(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { error: "Not authenticated or no organization" };
  }

  const { error } = await supabase
    .from("job_postings")
    .delete()
    .eq("id", jobId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  return { success: true };
}

export async function publishJob(jobId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from("job_postings")
    .update({ status: "active" })
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/jobs");
  return { data };
}

export async function getJobs() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { error: "Not authenticated", data: [] };
  }

  const { data, error } = await supabase
    .from("job_postings")
    .select("*, interview_templates(id, name)")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data };
}

export async function getJob(jobId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select("*, interview_templates(id, name)")
    .eq("id", jobId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getPublicJob(jobId: string) {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("job_postings")
    .select("id, title, description, location, employment_type, hourly_rate_min, hourly_rate_max, requirements, org_id, organizations(name)")
    .eq("id", jobId)
    .eq("status", "active")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

