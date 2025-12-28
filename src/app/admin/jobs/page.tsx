import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Plus, ArrowLeft, ChevronRight, MapPin } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Job Postings</h1>
          </div>
          <Link href="/admin/jobs/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Create Job
            </Button>
          </Link>
        </div>

        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Title</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Location</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Type</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Template</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {jobs?.map((job) => (
                <tr key={job.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-medium text-slate-200">{job.title}</td>
                  <td className="p-4 text-slate-400">
                    {job.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-4 text-slate-400 capitalize">
                    {job.employment_type?.replace("_", " ") || "-"}
                  </td>
                  <td className="p-4 text-slate-400">
                    {(job.interview_templates as unknown as { name: string } | null)?.name || "-"}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        job.status === "active" ? "success" :
                        job.status === "paused" ? "warning" :
                        job.status === "closed" ? "error" : "default"
                      }
                    >
                      {job.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                    >
                      Edit <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!jobs || jobs.length === 0) && (
            <div className="text-center py-16 text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No job postings yet</p>
              <p className="text-sm mt-1">Create your first job to start hiring</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
