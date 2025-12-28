import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Video, Link as LinkIcon, MessageSquare, BarChart3, Brain, Copy } from "lucide-react";

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
      interview_template_versions (
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

  const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/candidate/interview/${interview.access_token}`;

  // Extract signal scores if available
  const scores = interview.scores as {
    totalScore?: number;
    signals?: Record<string, { score: number }>;
  } | null;
  
  const signalScores = scores?.signals
    ? Object.entries(scores.signals).map(([name, data]) => ({
        name,
        score: data.score,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/interviews" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{interview.candidate_name}</h1>
              <p className="text-slate-500 text-sm">{interview.candidate_email}</p>
            </div>
          </div>
          <Badge
            variant={
              interview.status === "completed" ? "success" :
              interview.status === "live" ? "warning" : "default"
            }
          >
            {interview.status}
          </Badge>
        </div>

        {/* Interview Link */}
        {interview.status === "scheduled" && (
          <Card className="mb-6">
            <CardHeader title="Interview Link" icon={<LinkIcon className="w-5 h-5" />} />
            <p className="text-slate-400 text-sm mb-3">Share this link with the candidate:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={interviewUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-300"
              />
              <button
                onClick={() => navigator.clipboard.writeText(interviewUrl)}
                className="px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </Card>
        )}

        {/* Scores */}
        {signalScores.length > 0 && (
          <Card className="mb-6">
            <CardHeader title="Evaluation Scores" icon={<BarChart3 className="w-5 h-5" />} />
            
            {scores?.totalScore !== undefined && (
              <div className="text-center p-6 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-500/20 mb-5">
                <p className="text-4xl font-bold text-amber-400">
                  {Math.round(scores.totalScore * 100)}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Overall Score</p>
              </div>
            )}
            
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

        {/* Transcript */}
        {interview.transcript && (
          <Card className="mb-6">
            <CardHeader title="Transcript" icon={<MessageSquare className="w-5 h-5" />} />
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {(interview.transcript as Array<{ role: string; content: string }>).map(
                (msg, i) => (
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
                )
              )}
            </div>
          </Card>
        )}

        {/* Summary */}
        {interview.summary && (
          <Card>
            <CardHeader title="AI Summary" icon={<Brain className="w-5 h-5" />} />
            <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{interview.summary}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
