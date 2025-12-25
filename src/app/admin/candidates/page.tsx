import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CandidatesPage() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  // Get applications for jobs in this org
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      created_at,
      resume_analysis,
      candidates (
        id,
        first_name,
        last_name,
        email
      ),
      job_postings!inner (
        id,
        title,
        org_id
      ),
      interviews (
        id,
        status,
        scores
      )
    `)
    .eq("job_postings.org_id", org.orgId)
    .order("created_at", { ascending: false });

  // Calculate stats
  const stats = {
    total: applications?.length || 0,
    applied: applications?.filter((a) => a.status === "applied").length || 0,
    interviewed: applications?.filter((a) => a.status === "interviewed").length || 0,
    accepted: applications?.filter((a) => a.status === "accepted").length || 0,
    rejected: applications?.filter((a) => a.status === "rejected").length || 0,
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Candidates</h1>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, color: "zinc" },
            { label: "Applied", value: stats.applied, color: "blue" },
            { label: "Interviewed", value: stats.interviewed, color: "yellow" },
            { label: "Accepted", value: stats.accepted, color: "emerald" },
            { label: "Rejected", value: stats.rejected, color: "red" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-zinc-800 rounded-lg p-4 border border-zinc-700`}
            >
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Applications List */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left p-4 text-zinc-400 font-medium">Candidate</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Job</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Status</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Applied</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications?.map((app) => {
                const candidate = app.candidates as unknown as {
                  first_name: string;
                  last_name: string;
                  email: string;
                } | null;
                const job = app.job_postings as unknown as { title: string } | null;
                const interviews = app.interviews as unknown as Array<{
                  status: string;
                  scores: Record<string, number> | null;
                }> | null;
                const interview = interviews?.[0];

                return (
                  <tr key={app.id} className="border-b border-zinc-700 last:border-0">
                    <td className="p-4">
                      <p className="font-medium">
                        {candidate?.first_name} {candidate?.last_name}
                      </p>
                      <p className="text-sm text-zinc-400">{candidate?.email}</p>
                    </td>
                    <td className="p-4 text-zinc-300">{job?.title}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          app.status === "accepted"
                            ? "bg-emerald-900 text-emerald-300"
                            : app.status === "rejected"
                            ? "bg-red-900 text-red-300"
                            : app.status === "interviewed"
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-blue-900 text-blue-300"
                        }`}
                      >
                        {app.status}
                      </span>
                      {interview?.scores && (
                        <span className="ml-2 text-xs text-zinc-400">
                          Score:{" "}
                          {Math.round(
                            (Object.values(interview.scores).reduce((a, b) => a + b, 0) /
                              Object.values(interview.scores).length) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/candidates/${app.id}`}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!applications || applications.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <p>No applications yet.</p>
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
