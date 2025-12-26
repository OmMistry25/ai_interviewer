import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { DecisionButtons } from "./DecisionButtons";

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default async function CandidateDetailPage({ params }: Props) {
  const { applicationId } = await params;
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: application } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      resume_path,
      resume_analysis,
      created_at,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      job_postings!inner (
        id,
        title,
        org_id
      ),
      interviews (
        id,
        status,
        transcript,
        scores,
        summary
      )
    `)
    .eq("id", applicationId)
    .eq("job_postings.org_id", org.orgId)
    .single();

  if (!application) {
    notFound();
  }

  const candidate = application.candidates as unknown as {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  } | null;
  const job = application.job_postings as unknown as { title: string } | null;
  const interviews = application.interviews as unknown as Array<{
    id: string;
    status: string;
    transcript: Array<{ role: string; content: string }> | null;
    scores: Record<string, number> | null;
    summary: string | null;
  }> | null;
  const interview = interviews?.[0];
  const resumeAnalysis = application.resume_analysis as unknown as {
    summary?: string;
    skills?: string[];
    experience_years?: number;
    education?: string;
    highlights?: string[];
    concerns?: string[];
  } | null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/candidates" className="text-zinc-400 hover:text-white text-sm">
            ← Back to Candidates
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {candidate?.first_name} {candidate?.last_name}
            </h1>
            <p className="text-zinc-400">{candidate?.email}</p>
            {candidate?.phone && (
              <p className="text-zinc-400">{candidate.phone}</p>
            )}
            <p className="text-sm text-zinc-500 mt-1">
              Applied for: {job?.title} •{" "}
              {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              application.status === "accepted"
                ? "bg-emerald-900 text-emerald-300"
                : application.status === "rejected"
                ? "bg-red-900 text-red-300"
                : application.status === "interviewed"
                ? "bg-yellow-900 text-yellow-300"
                : "bg-blue-900 text-blue-300"
            }`}
          >
            {application.status}
          </span>
        </div>

        {/* Decision Buttons */}
        {application.status === "interviewed" && (
          <div className="mb-8">
            <DecisionButtons applicationId={application.id} />
          </div>
        )}

        {/* Resume Analysis */}
        {resumeAnalysis && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">📄 Resume Analysis</h2>
            
            {resumeAnalysis.summary && (
              <p className="text-zinc-300 mb-4">{resumeAnalysis.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              {resumeAnalysis.experience_years !== undefined && (
                <div className="bg-zinc-700 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Experience</p>
                  <p className="text-lg font-semibold">{resumeAnalysis.experience_years} years</p>
                </div>
              )}
              {resumeAnalysis.education && (
                <div className="bg-zinc-700 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Education</p>
                  <p className="text-sm">{resumeAnalysis.education}</p>
                </div>
              )}
            </div>

            {resumeAnalysis.skills && resumeAnalysis.skills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-400 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {resumeAnalysis.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {resumeAnalysis.highlights && resumeAnalysis.highlights.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-400 mb-2">✓ Highlights</p>
                <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                  {resumeAnalysis.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {resumeAnalysis.concerns && resumeAnalysis.concerns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 mb-2">⚠ Concerns</p>
                <ul className="list-disc list-inside text-sm text-yellow-300 space-y-1">
                  {resumeAnalysis.concerns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Interview Scores */}
        {interview?.scores && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">📊 Interview Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(interview.scores).map(([signal, score]) => (
                <div key={signal} className="text-center p-4 bg-zinc-700 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-400">
                    {Math.round(score * 100)}%
                  </p>
                  <p className="text-sm text-zinc-400 capitalize">{signal.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Summary */}
        {interview?.summary && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">🤖 AI Summary</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{interview.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {interview?.transcript && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
            <h2 className="text-lg font-semibold mb-4">💬 Interview Transcript</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {interview.transcript.map((msg, i) => (
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
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
