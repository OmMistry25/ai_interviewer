import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: jobs } = await supabase
    .from("job_postings")
    .select(`
      id,
      title,
      location,
      employment_type,
      status,
      created_at,
      interview_templates (
        name
      )
    `)
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Job Postings</h1>
          <Link
            href="/admin/jobs/new"
            className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
          >
            + Create Job
          </Link>
        </div>

        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left p-4 text-zinc-400 font-medium">Title</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Location</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Type</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Template</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Status</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs?.map((job) => (
                <tr key={job.id} className="border-b border-zinc-700 last:border-0">
                  <td className="p-4 font-medium">{job.title}</td>
                  <td className="p-4 text-zinc-400">{job.location || "-"}</td>
                  <td className="p-4 text-zinc-400 capitalize">
                    {job.employment_type?.replace("_", "-") || "-"}
                  </td>
                  <td className="p-4 text-zinc-400">
                    {(job.interview_templates as unknown as { name: string } | null)?.name || "-"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        job.status === "active"
                          ? "bg-emerald-900 text-emerald-300"
                          : job.status === "paused"
                          ? "bg-yellow-900 text-yellow-300"
                          : job.status === "closed"
                          ? "bg-red-900 text-red-300"
                          : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!jobs || jobs.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <p>No job postings yet. Create your first one!</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
