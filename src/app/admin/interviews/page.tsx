import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateInterviewForm } from "./CreateInterviewForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Video, ArrowLeft, ChevronRight, User, Mail } from "lucide-react";

export default async function InterviewsPage() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  // Get published templates for creating interviews
  const { data: templates } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      interview_template_versions!interview_template_versions_template_id_fkey (
        id,
        published_at
      )
    `)
    .eq("org_id", org.orgId)
    .not("interview_template_versions.published_at", "is", null);

  // Get active job postings
  const { data: jobPostings } = await supabase
    .from("job_postings")
    .select("id, title, template_id")
    .eq("org_id", org.orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Get recent interviews
  const { data: interviews } = await supabase
    .from("interviews")
    .select(`
      id,
      candidate_name,
      candidate_email,
      status,
      created_at,
      interview_template_versions (
        interview_templates (
          name
        )
      )
    `)
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Interviews</h1>
          </div>
        </div>

        {/* Create Interview Form */}
        <Card className="mb-8">
          <CardHeader title="Create New Interview" description="Send a direct interview link to a candidate" />
          <CreateInterviewForm
            templates={
              templates?.map((t) => ({
                id: t.id,
                name: t.name,
              })) || []
            }
            jobPostings={
              jobPostings?.map((j) => ({
                id: j.id,
                title: j.title,
                templateId: j.template_id,
              })) || []
            }
          />
        </Card>

        {/* Interview List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300">Recent Interviews</h2>

          {interviews?.map((interview) => {
            const templateVersions = interview.interview_template_versions as unknown as {
              interview_templates: { name: string } | null;
            } | null;
            const templateName = templateVersions?.interview_templates?.name || "Unknown";

            return (
              <Card key={interview.id} hover>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700/50 text-slate-400 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{interview.candidate_name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mail className="w-3 h-3" />
                        {interview.candidate_email}
                        <span className="text-slate-600">•</span>
                        {templateName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        interview.status === "completed" ? "success" :
                        interview.status === "live" ? "warning" : "default"
                      }
                    >
                      {interview.status}
                    </Badge>
                    <Link
                      href={`/admin/interviews/${interview.id}`}
                      className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                    >
                      View <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}

          {(!interviews || interviews.length === 0) && (
            <Card>
              <div className="text-center py-8 text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No interviews yet</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
