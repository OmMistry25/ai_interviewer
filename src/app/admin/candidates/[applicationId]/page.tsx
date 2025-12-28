import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { DecisionButtons } from "./DecisionButtons";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { ArrowLeft, FileText, BarChart3, MessageSquare, Brain, CheckCircle, AlertTriangle, GraduationCap, Star } from "lucide-react";

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
    scores: {
      totalScore?: number;
      signals?: Record<string, { score: number }>;
    } | null;
    summary: string | null;
  }> | null;
  const interview = interviews?.[0];
  
  // Extract signal scores for display
  const signalScores = interview?.scores?.signals
    ? Object.entries(interview.scores.signals).map(([name, data]) => ({
        name,
        score: data.score,
      }))
    : [];
  const totalScore = interview?.scores?.totalScore;

  const resumeAnalysis = application.resume_analysis as unknown as {
    summary?: string;
    skills?: string[];
    years_of_experience?: number | null;
    education?: string[];
    relevant_experience?: string[];
    strengths?: string[];
    concerns?: string[];
    fit_score?: number;
  } | null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/candidates" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Candidates
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">
              {candidate?.first_name} {candidate?.last_name}
            </h1>
            <p className="text-slate-400 mt-1">{candidate?.email}</p>
            {candidate?.phone && (
              <p className="text-slate-500 text-sm">{candidate.phone}</p>
            )}
            <p className="text-sm text-slate-600 mt-2">
              Applied for <span className="text-slate-400">{job?.title}</span> • {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        {/* Decision Buttons */}
        {application.status === "interviewed" && (
          <Card className="mb-6">
            <DecisionButtons applicationId={application.id} />
          </Card>
        )}

        {/* Resume Analysis */}
        {resumeAnalysis && (
          <Card className="mb-6">
            <CardHeader title="Resume Analysis" icon={<FileText className="w-5 h-5" />} />
            
            {resumeAnalysis.summary && (
              <p className="text-slate-400 mb-5 leading-relaxed">{resumeAnalysis.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-5">
              {resumeAnalysis.years_of_experience !== undefined && resumeAnalysis.years_of_experience !== null && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Experience</p>
                  <p className="text-lg font-semibold text-slate-200">{resumeAnalysis.years_of_experience} years</p>
                </div>
              )}
              {resumeAnalysis.fit_score !== undefined && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Fit Score</p>
                  <p className="text-lg font-semibold text-amber-400">{resumeAnalysis.fit_score}/10</p>
                </div>
              )}
            </div>

            {resumeAnalysis.education && resumeAnalysis.education.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40 mb-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Education
                </div>
                <p className="text-sm text-slate-300">{resumeAnalysis.education.join(", ")}</p>
              </div>
            )}

            {resumeAnalysis.skills && resumeAnalysis.skills.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-slate-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {resumeAnalysis.skills.map((skill, i) => (
                    <Badge key={i} variant="success">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {resumeAnalysis.strengths && resumeAnalysis.strengths.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Strengths
                </div>
                <ul className="space-y-2">
                  {resumeAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resumeAnalysis.concerns && resumeAnalysis.concerns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Areas to Explore
                </div>
                <ul className="space-y-2">
                  {resumeAnalysis.concerns.map((c, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Interview Scores */}
        {signalScores.length > 0 && (
          <Card className="mb-6">
            <CardHeader title="Interview Scores" icon={<BarChart3 className="w-5 h-5" />} />
            
            {/* Overall Score */}
            {totalScore !== undefined && (
              <div className="text-center p-6 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-500/20 mb-5">
                <p className="text-4xl font-bold text-amber-400">
                  {Math.round(totalScore * 100)}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Overall Score</p>
              </div>
            )}

            {/* Signal Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {signalScores.map(({ name, score }) => (
                <div key={name} className="text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700/40">
                  <p className="text-2xl font-bold text-slate-100">
                    {Math.round(score * 100)}%
                  </p>
                  <p className="text-xs text-slate-500 capitalize mt-1">{name.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Interview Summary */}
        {interview?.summary && (
          <Card className="mb-6">
            <CardHeader title="AI Summary" icon={<Brain className="w-5 h-5" />} />
            <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{interview.summary}</p>
          </Card>
        )}

        {/* Transcript */}
        {interview?.transcript && (
          <Card>
            <CardHeader title="Interview Transcript" icon={<MessageSquare className="w-5 h-5" />} />
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {interview.transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg ${
                    msg.role === "assistant"
                      ? "bg-slate-800/50 border border-slate-700/40"
                      : "bg-amber-500/10 border border-amber-500/20 ml-4"
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${
                    msg.role === "assistant" ? "text-slate-500" : "text-amber-500"
                  }`}>
                    {msg.role === "assistant" ? "Interviewer" : "Candidate"}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
