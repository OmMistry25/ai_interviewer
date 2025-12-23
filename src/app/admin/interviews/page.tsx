import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateInterviewForm } from "./CreateInterviewForm";

export default async function InterviewsPage() {
  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  // Get published templates
  const { data: templates } = await supabase
    .from("interview_templates")
    .select("id, name")
    .eq("org_id", org.orgId)
    .eq("status", "published");

  // Get interviews
  const { data: interviews } = await supabase
    .from("interviews")
    .select("id, candidate_name, status, access_token, created_at")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Interviews</h1>
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        {/* Create Interview */}
        {templates && templates.length > 0 ? (
          <CreateInterviewForm templates={templates} />
        ) : (
          <p className="text-zinc-500 mb-8">
            No published templates. <Link href="/admin/templates" className="text-blue-400">Create and publish a template</Link> first.
          </p>
        )}

        {/* Interview List */}
        <h2 className="text-lg font-semibold text-white mb-4">All Interviews</h2>
        {interviews && interviews.length > 0 ? (
          <div className="space-y-2">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="p-4 bg-zinc-800 rounded"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">{interview.candidate_name}</p>
                    <p className="text-zinc-500 text-sm">
                      Status:{" "}
                      <span
                        className={
                          interview.status === "completed"
                            ? "text-green-400"
                            : interview.status === "live"
                            ? "text-blue-400"
                            : "text-yellow-400"
                        }
                      >
                        {interview.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Interview Link:</p>
                      <code className="text-xs bg-zinc-700 px-2 py-1 rounded text-zinc-300">
                        /candidate/interview/{interview.access_token}
                      </code>
                    </div>
                    <Link
                      href={`/admin/interviews/${interview.id}`}
                      className="inline-block px-3 py-1 text-xs rounded bg-zinc-700 text-white hover:bg-zinc-600"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No interviews yet.</p>
        )}
      </div>
    </div>
  );
}

