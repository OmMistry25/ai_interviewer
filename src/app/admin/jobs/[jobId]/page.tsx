import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { JobForm } from "../JobForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";

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
      template_id
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
      interview_template_versions!interview_template_versions_template_id_fkey (
        published_at
      )
    `)
    .eq("org_id", org.orgId)
    .not("interview_template_versions.published_at", "is", null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/jobs" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Edit Job</h1>
          </div>
        </div>

        <Card>
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
              template_id: job.template_id || undefined,
              status: job.status,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
