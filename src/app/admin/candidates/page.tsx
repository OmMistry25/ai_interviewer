import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  applied: { label: "Applied", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  scheduled: { label: "Scheduled", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  interviewed: { label: "Interviewed", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  accepted: { label: "Accepted", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  rejected: { label: "Rejected", color: "text-red-400", bgColor: "bg-red-500/20" },
};

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; job?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  // Get jobs for filter
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("id, title")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  // Build query for applications
  let query = supabase
    .from("applications")
    .select(`
      id,
      status,
      scheduled_at,
      created_at,
      resume_analysis,
      candidate:candidates(id, first_name, last_name, email),
      job:job_postings!inner(id, title, org_id),
      interview:interviews(id, status, access_token)
    `)
    .eq("job.org_id", org.orgId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.job) {
    query = query.eq("job_id", params.job);
  }

  const { data: applications, error } = await query;

  // Calculate stats
  const stats = {
    total: applications?.length || 0,
    applied: applications?.filter(a => a.status === "applied").length || 0,
    scheduled: applications?.filter(a => a.status === "scheduled").length || 0,
    interviewed: applications?.filter(a => a.status === "interviewed").length || 0,
    pending_decision: applications?.filter(a => a.status === "interviewed").length || 0,
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Candidates</h1>
              <p className="text-zinc-400 text-sm">{org.name}</p>
            </div>
            <Link
              href="/admin/jobs"
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
            >
              Manage Jobs
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <p className="text-zinc-400 text-sm">Total Candidates</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <p className="text-zinc-400 text-sm">New Applications</p>
            <p className="text-3xl font-bold text-blue-400">{stats.applied}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <p className="text-zinc-400 text-sm">Scheduled</p>
            <p className="text-3xl font-bold text-amber-400">{stats.scheduled}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
            <p className="text-zinc-400 text-sm">Pending Decision</p>
            <p className="text-3xl font-bold text-purple-400">{stats.pending_decision}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            defaultValue={params.status || ""}
            onChange={(e) => {
              const url = new URL(window.location.href);
              if (e.target.value) {
                url.searchParams.set("status", e.target.value);
              } else {
                url.searchParams.delete("status");
              }
              window.location.href = url.toString();
            }}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            defaultValue={params.job || ""}
            onChange={(e) => {
              const url = new URL(window.location.href);
              if (e.target.value) {
                url.searchParams.set("job", e.target.value);
              } else {
                url.searchParams.delete("job");
              }
              window.location.href = url.toString();
            }}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
          >
            <option value="">All Jobs</option>
            {jobs?.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>

        {/* Candidates List */}
        {!applications || applications.length === 0 ? (
          <div className="bg-zinc-800/50 rounded-xl p-12 text-center border border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">No candidates yet</h2>
            <p className="text-zinc-500">
              Candidates will appear here once they apply to your job postings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => {
              const candidate = app.candidate;
              const job = app.job;
              const interview = app.interview?.[0];
              const status = statusConfig[app.status] || statusConfig.applied;
              const fitScore = app.resume_analysis?.fit_score;

              return (
                <Link
                  key={app.id}
                  href={`/admin/candidates/${app.id}`}
                  className="block bg-zinc-800/50 rounded-xl p-5 border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                          {status.label}
                        </span>
                        {fitScore && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            fitScore >= 7 ? "bg-emerald-500/20 text-emerald-400" :
                            fitScore >= 5 ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>
                            Fit: {fitScore}/10
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm mb-2">{candidate.email}</p>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span>📋 {job.title}</span>
                        <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                        {app.scheduled_at && (
                          <span>📅 {new Date(app.scheduled_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-zinc-500">
                      →
                    </div>
                  </div>
                </Link>
              );
            })}
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

