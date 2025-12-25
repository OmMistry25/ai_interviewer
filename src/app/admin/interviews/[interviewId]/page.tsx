import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ interviewId: string }>;
}

export default async function InterviewDetailPage({ params }: Props) {
  const { interviewId } = await params;
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: interview } = await supabase
    .from("interviews")
    .select(`
      *,
      template_versions (
        config,
        interview_templates (
          name
        )
      )
    `)
    .eq("id", interviewId)
    .eq("org_id", org.orgId)
    .single();

  if (!interview) {
    notFound();
  }

  const templateVersions = interview.template_versions as unknown as {
    config: Record<string, unknown>;
    interview_templates: { name: string } | null;
  } | null;

  const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/candidate/interview/${interview.token}`;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/interviews" className="text-zinc-400 hover:text-white text-sm">
            ← Back to Interviews
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">{interview.candidate_name}</h1>
            <p className="text-zinc-400">{interview.candidate_email}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              interview.status === "completed"
                ? "bg-emerald-900 text-emerald-300"
                : interview.status === "in_progress"
                ? "bg-yellow-900 text-yellow-300"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {interview.status}
          </span>
        </div>

        {/* Interview Link */}
        {interview.status === "pending" && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-2">Interview Link</h2>
            <p className="text-zinc-400 text-sm mb-3">Share this link with the candidate:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={interviewUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(interviewUrl)}
                className="px-3 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {interview.transcript && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">Transcript</h2>
            <div className="space-y-4">
              {(interview.transcript as Array<{ role: string; content: string }>).map(
                (msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      msg.role === "assistant"
                        ? "bg-zinc-700"
                        : "bg-emerald-900/30"
                    }`}
                  >
                    <p className="text-xs text-zinc-400 mb-1">
                      {msg.role === "assistant" ? "Interviewer" : "Candidate"}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Scores */}
        {interview.scores && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">Evaluation Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(interview.scores as Record<string, number>).map(
                ([signal, score]) => (
                  <div key={signal} className="text-center p-4 bg-zinc-700 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">
                      {Math.round(score * 100)}%
                    </p>
                    <p className="text-sm text-zinc-400 capitalize">{signal}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {interview.summary && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
            <h2 className="text-lg font-semibold mb-4">AI Summary</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{interview.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
