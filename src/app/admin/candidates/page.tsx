import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Users, ArrowLeft, ChevronRight } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Candidates</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, color: "slate" },
            { label: "Applied", value: stats.applied, color: "blue" },
            { label: "Interviewed", value: stats.interviewed, color: "amber" },
            { label: "Accepted", value: stats.accepted, color: "emerald" },
            { label: "Rejected", value: stats.rejected, color: "red" },
          ].map((stat) => (
            <Card key={stat.label} padding="sm">
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Applications List */}
        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Candidate</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Job</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Applied</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm"></th>
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

                return (
                  <tr key={app.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-slate-200">
                        {candidate?.first_name} {candidate?.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{candidate?.email}</p>
                    </td>
                    <td className="p-4 text-slate-400">{job?.title}</td>
                    <td className="p-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/candidates/${app.id}`}
                        className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                      >
                        View <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!applications || applications.length === 0) && (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No applications yet</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
