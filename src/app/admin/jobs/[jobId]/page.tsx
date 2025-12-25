import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { JobForm } from "../JobForm";

interface Props {
  params: Promise<{ jobId: string }>;
}

export default async function EditJobPage({ params }: Props) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: job } = await supabase
    .from("job_postings")
    .select(`
      id,
      title,
      description,
      location,
      employment_type,
      hourly_rate_min,
      hourly_rate_max,
      status,
      template_version_id,
      interview_template_versions (
        template_id
      )
    `)
    .eq("id", jobId)
    .eq("org_id", org.orgId)
    .single();

  if (!job) {
    notFound();
  }

  // Get published templates
  const { data: templates } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      interview_template_versions!inner (
        status
      )
    `)
    .eq("org_id", org.orgId)
    .eq("interview_template_versions.status", "published");

  const templateVersion = job.interview_template_versions as unknown as { template_id: string } | null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Job</h1>
        <JobForm
          templates={templates?.map((t) => ({ id: t.id, name: t.name })) || []}
          job={{
            id: job.id,
            title: job.title,
            description: job.description || undefined,
            location: job.location || undefined,
            employment_type: job.employment_type,
            hourly_rate_min: job.hourly_rate_min || undefined,
            hourly_rate_max: job.hourly_rate_max || undefined,
            template_id: templateVersion?.template_id,
            status: job.status,
          }}
        />
      </div>
    </div>
  );
}
