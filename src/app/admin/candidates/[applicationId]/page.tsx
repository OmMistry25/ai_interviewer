import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getResumeUrl } from "@/lib/resume/storage";
import { DecisionButtons } from "./DecisionButtons";

type Params = Promise<{ applicationId: string }>;

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  applied: { label: "Applied", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  scheduled: { label: "Scheduled", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  interviewed: { label: "Interviewed", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  accepted: { label: "Accepted", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  rejected: { label: "Rejected", color: "text-red-400", bgColor: "bg-red-500/20" },
};

export default async function CandidateDetailPage({ params }: { params: Params }) {
  const { applicationId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  // Get application with all details
  const { data: application, error } = await supabase
    .from("applications")
    .select(`
      *,
      candidate:candidates(*),
      job:job_postings(*, organizations(name)),
      interview:interviews(*, evaluations(*))
    `)
    .eq("id", applicationId)
    .single();

  if (error || !application) {
    notFound();
  }

  // Verify org access
  const job = application.job as any;
  if (job.org_id !== org.orgId) {
    notFound();
  }

  const candidate = application.candidate as any;
  const interview = (application.interview as any)?.[0];
  const evaluation = interview?.evaluations?.[0];
  const resumeAnalysis = application.resume_analysis as any;
  const status = statusConfig[application.status] || statusConfig.applied;

  // Get resume URL if exists
  let resumeUrl: string | null = null;
  if (application.resume_path) {
    const result = await getResumeUrl(application.resume_path);
    resumeUrl = result.url || null;
  }

  // Get interview transcript
  let transcript: any[] = [];
  if (interview) {
    const { data: turns } = await supabase
      .from("interview_turns")
      .select("*")
      .eq("interview_id", interview.id)
      .order("timestamp", { ascending: true });
    transcript = turns || [];
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/admin/candidates" className="text-zinc-400 hover:text-white">
                ← Back
              </Link>
              <div>
                <h1 className="text-xl font-bold">
                  {candidate.first_name} {candidate.last_name}
                </h1>
                <p className="text-zinc-400 text-sm">{job.title}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            
            {(application.status === "interviewed" || application.status === "scheduled") && (
              <DecisionButtons applicationId={applicationId} candidateEmail={candidate.email} />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Candidate Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
              <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-500">Email</p>
                  <p className="text-white">{candidate.email}</p>
                </div>
                {candidate.phone && (
                  <div>
                    <p className="text-zinc-500">Phone</p>
                    <p className="text-white">{candidate.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-zinc-500">Applied</p>
                  <p className="text-white">{new Date(application.created_at).toLocaleDateString()}</p>
                </div>
                {application.scheduled_at && (
                  <div>
                    <p className="text-zinc-500">Interview Scheduled</p>
                    <p className="text-white">{new Date(application.scheduled_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resume */}
            {resumeUrl && (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                <h2 className="text-lg font-semibold mb-4">Resume</h2>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors text-sm"
                >
                  <span>📄</span>
                  <span>{application.resume_original_name || "View Resume"}</span>
                </a>
              </div>
            )}

            {/* AI Resume Analysis */}
            {resumeAnalysis && (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">AI Analysis</h2>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    resumeAnalysis.fit_score >= 7 ? "bg-emerald-500/20 text-emerald-400" :
                    resumeAnalysis.fit_score >= 5 ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    Fit Score: {resumeAnalysis.fit_score}/10
                  </span>
                </div>
                
                <p className="text-zinc-300 text-sm mb-4">{resumeAnalysis.summary}</p>

                {resumeAnalysis.strengths?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-zinc-500 text-xs uppercase mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysis.strengths.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {resumeAnalysis.concerns?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-zinc-500 text-xs uppercase mb-2">Concerns</p>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysis.concerns.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4 pt-4 border-t border-zinc-700">
                  <div>
                    <p className="text-zinc-500">Customer Service</p>
                    <p className={resumeAnalysis.customer_service_experience ? "text-emerald-400" : "text-zinc-600"}>
                      {resumeAnalysis.customer_service_experience ? "✓ Yes" : "✗ No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Food Service</p>
                    <p className={resumeAnalysis.food_service_experience ? "text-emerald-400" : "text-zinc-600"}>
                      {resumeAnalysis.food_service_experience ? "✓ Yes" : "✗ No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Cash Handling</p>
                    <p className={resumeAnalysis.cash_handling_experience ? "text-emerald-400" : "text-zinc-600"}>
                      {resumeAnalysis.cash_handling_experience ? "✓ Yes" : "✗ No"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Interview Results */}
          <div className="md:col-span-2 space-y-6">
            {/* Interview Scores */}
            {evaluation && (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                <h2 className="text-lg font-semibold mb-4">Interview Scores</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {Object.entries(evaluation.scores?.signals || {}).map(([signal, data]: [string, any]) => (
                    <div key={signal} className="text-center">
                      <p className="text-zinc-500 text-xs uppercase mb-1">{signal}</p>
                      <p className="text-2xl font-bold text-white">
                        {typeof data === "object" ? data.total?.toFixed(1) : data?.toFixed(1) || "0"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
                  <span className="text-zinc-400">Total Score</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {(evaluation.scores?.totalScore || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Interview Transcript */}
            {transcript.length > 0 ? (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                <h2 className="text-lg font-semibold mb-4">Interview Transcript</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {transcript.map((turn: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        turn.speaker === "ai" 
                          ? "bg-blue-500/20 text-blue-400" 
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {turn.speaker === "ai" ? "AI" : candidate.first_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500 mb-1">
                          {turn.speaker === "ai" ? "Interviewer" : candidate.first_name}
                        </p>
                        <p className="text-zinc-300 text-sm">{turn.transcript}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : interview ? (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700 text-center">
                <p className="text-zinc-400">Interview scheduled but not yet completed.</p>
                {interview.access_token && (
                  <p className="text-zinc-500 text-sm mt-2">
                    Interview link: /candidate/interview/{interview.access_token}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700 text-center">
                <p className="text-zinc-400">No interview scheduled yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

