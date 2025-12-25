import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { getJob } from "../actions";
import { JobForm } from "../JobForm";
import Link from "next/link";

type Params = Promise<{ jobId: string }>;

export default async function EditJobPage({ params }: { params: Params }) {
  const { jobId } = await params;
  
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const { data: job, error } = await getJob(jobId);
  if (error || !job) {
    notFound();
  }

  // Get templates for dropdown
  const { data: templates } = await supabase
    .from("interview_templates")
    .select("id, name")
    .eq("org_id", org.orgId)
    .eq("status", "published");

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit Job</h1>
          {job.status === "active" && (
            <Link
              href={`/apply/${job.id}`}
              target="_blank"
              className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors text-sm"
            >
              View Public Apply Page →
            </Link>
          )}
        </div>
        <JobForm templates={templates || []} job={job} />
      </div>
    </div>
  );
}

