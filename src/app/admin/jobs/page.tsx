import { getJobs } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const { data: jobs } = await getJobs();

  // Get templates for the create form
  const { data: templates } = await supabase
    .from("interview_templates")
    .select("id, name")
    .eq("org_id", org.orgId)
    .eq("status", "published");

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-600",
    active: "bg-emerald-600",
    paused: "bg-amber-600",
    closed: "bg-red-600",
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Job Postings</h1>
            <p className="text-zinc-400 mt-1">Manage open positions for {org.name}</p>
          </div>
          <Link
            href="/admin/jobs/new"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
          >
            + Create Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-zinc-800 rounded-xl p-12 text-center">
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">No job postings yet</h2>
            <p className="text-zinc-500 mb-6">Create your first job posting to start receiving applications.</p>
            <Link
              href="/admin/jobs/new"
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Create Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <div
                key={job.id}
                className="bg-zinc-800 rounded-xl p-6 hover:bg-zinc-750 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold">{job.title}</h2>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[job.status]} text-white`}>
                        {job.status}
                      </span>
                    </div>
                    {job.location && (
                      <p className="text-zinc-400 text-sm mb-1">📍 {job.location}</p>
                    )}
                    {job.description && (
                      <p className="text-zinc-500 text-sm line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
                      <span>
                        {job.employment_type === "full_time" ? "Full-time" : 
                         job.employment_type === "part_time" ? "Part-time" : "Contract"}
                      </span>
                      {job.hourly_rate_min && job.hourly_rate_max && (
                        <span>${job.hourly_rate_min} - ${job.hourly_rate_max}/hr</span>
                      )}
                      {job.interview_templates && (
                        <span>Interview: {job.interview_templates.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {job.status === "active" && (
                      <Link
                        href={`/apply/${job.id}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded text-sm hover:bg-zinc-600 transition-colors"
                      >
                        View Apply Page
                      </Link>
                    )}
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-zinc-700">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

