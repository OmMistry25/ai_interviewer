import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Clock
} from "lucide-react";
import { EditScheduleButton } from "./EditScheduleButton";

type Params = Promise<{ token: string }>;

export const metadata = {
  title: "Your Application Profile - Cliq",
  description: "View your interview results and application status.",
};

export default async function CandidateProfilePage({ params }: { params: Params }) {
  const { token } = await params;
  const adminClient = createSupabaseAdminClient();

  // Find interview by access token
  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .select(`
      id,
      application_id,
      status,
      transcript,
      scores,
      summary
    `)
    .eq("access_token", token)
    .single();

  if (interviewError || !interview) {
    notFound();
  }

  if (!interview.application_id) {
    notFound();
  }

  // Get application details
  const { data: application, error: appError } = await adminClient
    .from("applications")
    .select(`
      id,
      status,
      resume_analysis,
      schedule_availability,
      schedule_submitted_at,
      candidates (first_name, last_name, email),
      job_postings (title, organizations (name))
    `)
    .eq("id", interview.application_id)
    .single();

  if (appError || !application) {
    notFound();
  }

  const candidate = application.candidates as unknown as { first_name: string; last_name: string; email: string };
  const jobPosting = application.job_postings as unknown as { title: string; organizations: { name: string } };
  
  const resumeAnalysis = application.resume_analysis as unknown as {
    summary?: string;
    skills?: string[];
    years_of_experience?: number | null;
    education?: string[];
    strengths?: string[];
    concerns?: string[];
    fit_score?: number;
  } | null;

  const scheduleAvailability = application.schedule_availability as unknown as Record<string, string[]> | null;
  
  const interviewScores = interview.scores as unknown as {
    totalScore?: number;
    signals?: Record<string, { score: number }>;
  } | null;

  const transcript = interview.transcript as unknown as Array<{ role: string; content: string }> | null;

  // Days and shifts for display
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun"
  };

  const signalScores = interviewScores?.signals
    ? Object.entries(interviewScores.signals).map(([name, data]) => ({
        name,
        score: data.score,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-500 font-medium mb-1">Application Profile</p>
              <h1 className="text-2xl font-bold text-slate-100">
                {candidate?.first_name} {candidate?.last_name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {jobPosting?.title} at {jobPosting?.organizations?.name}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={application.status === "interviewed" ? "success" : "warning"}>
                {application.status === "interviewed" ? "Submitted" : application.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        
        {/* Resume Analysis */}
        {resumeAnalysis && (
          <Card>
            <CardHeader title="Resume Analysis" icon={<FileText className="w-5 h-5" />} />
            
            {resumeAnalysis.summary && (
              <p className="text-slate-400 mb-5 leading-relaxed">{resumeAnalysis.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-5">
              {resumeAnalysis.years_of_experience !== undefined && resumeAnalysis.years_of_experience !== null && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Briefcase className="w-4 h-4" />
                    Experience
                  </div>
                  <p className="text-lg font-semibold text-slate-200">{resumeAnalysis.years_of_experience} years</p>
                </div>
              )}
              {resumeAnalysis.fit_score !== undefined && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/40">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    Fit Score
                  </div>
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
                  Areas to Develop
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
        {(interviewScores?.totalScore !== undefined || signalScores.length > 0) && (
          <Card>
            <CardHeader title="Interview Performance" icon={<BarChart3 className="w-5 h-5" />} />
            
            {interviewScores?.totalScore !== undefined && (
              <div className="text-center p-6 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-500/20 mb-5">
                <p className="text-4xl font-bold text-amber-400">
                  {Math.round(interviewScores.totalScore * 100)}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Overall Score</p>
              </div>
            )}

            {signalScores.length > 0 && (
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
            )}
          </Card>
        )}

        {/* Schedule Availability */}
        {scheduleAvailability && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardHeader title="Your Availability" icon={<Calendar className="w-5 h-5" />} />
              <EditScheduleButton 
                applicationId={application.id} 
                interviewToken={token}
                currentAvailability={scheduleAvailability}
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-500 w-24"></th>
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
                      <td className="p-2 text-slate-400 capitalize flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {shift}
                      </td>
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

        {/* Interview Transcript */}
        {transcript && transcript.length > 0 && (
          <Card>
            <CardHeader title="Interview Transcript" icon={<MessageSquare className="w-5 h-5" />} />
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {transcript.map((msg, i) => (
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
                    {msg.role === "assistant" ? "Interviewer" : "You"}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer note */}
        <div className="text-center text-sm text-slate-500 py-6">
          <p>Save this page URL to access your profile anytime.</p>
          <p className="text-slate-600 mt-1">Questions? Contact us at support@usecliq.com</p>
        </div>
      </main>
    </div>
  );
}

