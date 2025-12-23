import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ interviewId: string }>;

export default async function InterviewDetailPage({
  params,
}: {
  params: Params;
}) {
  const { interviewId } = await params;
  
  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  // Get interview
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, candidate_name, status, created_at, started_at, completed_at")
    .eq("id", interviewId)
    .eq("org_id", org.orgId)
    .single();

  if (!interview) {
    redirect("/admin/interviews");
  }

  // Get turns (Task 13.2)
  const { data: turns } = await supabase
    .from("interview_turns")
    .select("id, speaker, transcript, question_id, created_at")
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: true });

  // Get evaluation (Task 13.3)
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("scores, decision")
    .eq("interview_id", interviewId)
    .single();

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {interview.candidate_name}
            </h1>
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
          <Link
            href="/admin/interviews"
            className="text-zinc-400 hover:text-white"
          >
            ← Back to interviews
          </Link>
        </div>

        {/* Score Breakdown (Task 13.3) */}
        {evaluation && (
          <div className="mb-8 p-6 bg-zinc-800 rounded">
            <h2 className="text-lg font-semibold text-white mb-4">
              Evaluation
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-zinc-500 text-sm">Total Score</p>
                <p className="text-2xl font-bold text-white">
                  {(((evaluation.scores as { totalScore?: number })?.totalScore ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm">Decision</p>
                <p
                  className={`text-2xl font-bold ${
                    evaluation.decision === "advance"
                      ? "text-green-400"
                      : evaluation.decision === "hold"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {evaluation.decision || "Pending"}
                </p>
              </div>
            </div>

            {/* Signal breakdown */}
            {(evaluation.scores as { signals?: Record<string, { score: number; weight: number }> })?.signals && (
              <div className="space-y-2">
                <p className="text-zinc-400 text-sm">Signal Breakdown:</p>
                {Object.entries(
                  (evaluation.scores as { signals: Record<string, { score: number; weight: number }> }).signals
                ).map(([signal, data]) => (
                  <div
                    key={signal}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-zinc-300">{signal}</span>
                    <span className="text-white">
                      {(data.score * 100).toFixed(0)}% (weight: {data.weight})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transcript (Task 13.2) */}
        <div className="p-6 bg-zinc-800 rounded">
          <h2 className="text-lg font-semibold text-white mb-4">Transcript</h2>
          {turns && turns.length > 0 ? (
            <div className="space-y-4">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-4 rounded ${
                    turn.speaker === "ai"
                      ? "bg-blue-900/30 border-l-4 border-blue-500"
                      : "bg-zinc-700/50 border-l-4 border-green-500"
                  }`}
                >
                  <p className="text-xs text-zinc-500 mb-1">
                    {turn.speaker === "ai" ? "AI Interviewer" : "Candidate"}
                    {turn.question_id && ` • Q: ${turn.question_id}`}
                  </p>
                  <p className="text-white">{turn.transcript}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No transcript available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

