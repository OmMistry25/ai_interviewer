import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateInterviewForm } from "./CreateInterviewForm";

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
      interview_template_versions!inner (
        id,
        status
      )
    `)
    .eq("org_id", org.orgId)
    .eq("interview_template_versions.status", "published");

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
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Interviews</h1>

        {/* Create Interview Form */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Interview</h2>
          <CreateInterviewForm
            templates={
              templates?.map((t) => ({
                id: t.id,
                name: t.name,
              })) || []
            }
          />
        </div>

        {/* Interview List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Interviews</h2>

          {interviews?.map((interview) => {
            const templateVersions = interview.interview_template_versions as unknown as {
              interview_templates: { name: string } | null;
            } | null;
            const templateName = templateVersions?.interview_templates?.name || "Unknown";

            return (
              <div
                key={interview.id}
                className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{interview.candidate_name}</p>
                  <p className="text-sm text-zinc-400">
                    {interview.candidate_email} • {templateName}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      interview.status === "completed"
                        ? "bg-emerald-900 text-emerald-300"
                        : interview.status === "in_progress"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {interview.status}
                  </span>
                  <Link
                    href={`/admin/interviews/${interview.id}`}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}

          {(!interviews || interviews.length === 0) && (
            <div className="text-center py-8 text-zinc-500">
              <p>No interviews yet.</p>
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
