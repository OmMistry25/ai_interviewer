import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { DecisionButtons } from "./DecisionButtons";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { ArrowLeft, FileText, BarChart3, MessageSquare, Brain, CheckCircle, AlertTriangle, GraduationCap, Star, Calendar, Clock, Flag, ThumbsUp, ThumbsDown } from "lucide-react";

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
      schedule_availability,
      schedule_submitted_at,
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

  // Fetch interview flags if we have an interview
  let interviewFlags: Array<{
    id: string;
    turn_index: number;
    flag_type: "red" | "green";
    category: string;
    description: string;
    quote: string | null;
    clip_path: string | null;
  }> = [];

  if (interview?.id) {
    const { data: flags } = await supabase
      .from("interview_flags")
      .select("id, turn_index, flag_type, category, description, quote, clip_path")
      .eq("interview_id", interview.id)
      .order("turn_index", { ascending: true });
    
    interviewFlags = (flags || []) as typeof interviewFlags;
  }

  const redFlags = interviewFlags.filter(f => f.flag_type === "red");
  const greenFlags = interviewFlags.filter(f => f.flag_type === "green");
  
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

  // Schedule availability
  const scheduleAvailability = application.schedule_availability as unknown as Record<string, string[]> | null;
  const scheduleSubmittedAt = application.schedule_submitted_at as string | null;
  
  // Days and shifts for display
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun"
  };
  const SHIFT_LABELS: Record<string, string> = {
    morning: "Morning (6am-10am)",
    afternoon: "Afternoon (10am-2pm)", 
    evening: "Evening (2pm-6pm)",
    night: "Night (6pm-10pm)"
  };

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
        {(application.status === "interviewed" || application.status === "scheduled") && (
          <Card className="mb-6">
            <DecisionButtons applicationId={application.id} />
          </Card>
        )}

        {/* Schedule Availability */}
        {scheduleAvailability && (
          <Card className="mb-6">
            <CardHeader title="Work Availability" icon={<Calendar className="w-5 h-5" />} />
            {scheduleSubmittedAt && (
              <p className="text-xs text-slate-500 mb-4">
                Submitted {new Date(scheduleSubmittedAt).toLocaleDateString()}
              </p>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-500 w-32"></th>
                    {DAYS.map((day) => (
                      <th key={day} className="p-2 text-center text-slate-400 font-medium">
                        {DAY_LABELS[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["morning", "afternoon", "evening", "night"].map((shift) => (
                    <tr key={shift}>
                      <td className="p-2 text-slate-400 capitalize">{shift}</td>
                      {DAYS.map((day) => {
                        const isAvailable = scheduleAvailability[day]?.includes(shift);
                        return (
                          <td key={`${day}-${shift}`} className="p-2 text-center">
                            {isAvailable ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/30 text-slate-700">
                                –
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary of availability */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-sm text-slate-400">
                <span className="text-emerald-400 font-medium">
                  {Object.values(scheduleAvailability).flat().length}
                </span>{" "}
                shifts available per week
              </p>
            </div>
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

        {/* Interview Observations (Flags) */}
        {interviewFlags.length > 0 && (
          <Card className="mb-6">
            <CardHeader title="Interview Observations" icon={<Flag className="w-5 h-5" />} />
            
            {/* Summary counts */}
            <div className="flex gap-4 mb-5">
              {greenFlags.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{greenFlags.length} Positive</span>
                </div>
              )}
              {redFlags.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">{redFlags.length} Concern{redFlags.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Green flags first */}
            {greenFlags.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <ThumbsUp className="w-3 h-3 text-emerald-500" />
                  Positive Signals
                </p>
                <div className="space-y-3">
                  {greenFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-emerald-400 font-medium mb-1 capitalize">
                            {flag.category.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-slate-300">{flag.description}</p>
                          {flag.quote && (
                            <p className="text-xs text-slate-500 mt-2 italic">
                              &ldquo;{flag.quote}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          Q{flag.turn_index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags */}
            {redFlags.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <ThumbsDown className="w-3 h-3 text-red-500" />
                  Areas of Concern
                </p>
                <div className="space-y-3">
                  {redFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-4 rounded-lg bg-red-500/5 border border-red-500/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-red-400 font-medium mb-1 capitalize">
                            {flag.category.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-slate-300">{flag.description}</p>
                          {flag.quote && (
                            <p className="text-xs text-slate-500 mt-2 italic">
                              &ldquo;{flag.quote}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          Q{flag.turn_index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
