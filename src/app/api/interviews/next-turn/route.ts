import { NextRequest, NextResponse } from "next/server";
import {
  loadInterviewState,
  getCurrentQuestion,
  getNextQuestion,
  updateCurrentQuestion,
  completeInterview,
  loadResumeContext,
} from "@/lib/interview/orchestrator";
import {
  evaluateAnswer,
  shouldFollowUp,
  getFollowUpPrompt,
} from "@/lib/interview/evaluator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Extend timeout for this route
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { interviewId, candidateAnswer, followupsUsed = 0 } = await request.json();

    if (!interviewId || !candidateAnswer) {
      return NextResponse.json(
        { error: "Interview ID and candidate answer required" },
        { status: 400 }
      );
    }

    // OPTIMIZATION: Load state and resume context in parallel
    const [state, resumeContext] = await Promise.all([
      loadInterviewState(interviewId),
      loadResumeContext(interviewId),
    ]);

    if (!state) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (state.status !== "live") {
      return NextResponse.json(
        { error: "Interview is not live" },
        { status: 400 }
      );
    }

    const currentQuestion = getCurrentQuestion(state);
    if (!currentQuestion) {
      return NextResponse.json(
        { error: "No current question" },
        { status: 400 }
      );
    }

    // Evaluate the answer (this is the main bottleneck - now optimized with simpler prompt)
    const evaluation = await evaluateAnswer(
      currentQuestion,
      candidateAnswer,
      state.config,
      resumeContext
    );

    // OPTIMIZATION: Fire-and-forget DB operations (don't block response)
    const adminClient = createSupabaseAdminClient();
    const questionId = currentQuestion.id;
    const signal = currentQuestion.rubric?.signal || "general";
    const weight = currentQuestion.rubric?.weight || 0.25;

    // Background: Update evaluation scores (don't await)
    (async () => {
      try {
        const { data: existingEval } = await adminClient
          .from("evaluations")
          .select("scores")
          .eq("interview_id", interviewId)
          .single();

        const existingScores = (existingEval?.scores as {
          questionScores?: Record<string, number[]>;
          signalTotals?: Record<string, { total: number; count: number; weight: number }>;
        }) || {};

        const questionScores = existingScores.questionScores || {};
        if (!questionScores[questionId]) {
          questionScores[questionId] = [];
        }
        questionScores[questionId].push(evaluation.score);

        const signalTotals = existingScores.signalTotals || {};
        if (!signalTotals[signal]) {
          signalTotals[signal] = { total: 0, count: 0, weight };
        }
        signalTotals[signal].total += evaluation.score;
        signalTotals[signal].count += 1;

        const signals: Record<string, { score: number; weight: number }> = {};
        let totalWeighted = 0;
        let totalWeight = 0;
        
        for (const [sig, data] of Object.entries(signalTotals)) {
          const avgScore = data.count > 0 ? data.total / data.count : 0;
          signals[sig] = { score: avgScore, weight: data.weight };
          totalWeighted += avgScore * data.weight;
          totalWeight += data.weight;
        }
        
        const totalScore = totalWeight > 0 ? totalWeighted / totalWeight : 0;

        await adminClient.from("evaluations").upsert(
          {
            interview_id: interviewId,
            scores: { totalScore, questionScores, signals, signalTotals },
          },
          { onConflict: "interview_id" }
        );
      } catch (e) {
        console.error("Background evaluation update failed:", e);
      }
    })();

    const maxFollowups = state.config.policies?.max_followups_per_question ?? 1;

    // Check for follow-up
    if (shouldFollowUp(evaluation, followupsUsed, maxFollowups)) {
      const followupPrompt = getFollowUpPrompt(
        currentQuestion,
        evaluation.followupReason
      );

      if (followupPrompt) {
        return NextResponse.json({
          action: "followup",
          prompt: followupPrompt,
          questionId: currentQuestion.id,
          evaluation: {
            score: evaluation.score,
            reasoning: evaluation.reasoning,
          },
          followupsUsed: followupsUsed + 1,
        });
      }
    }

    // Move to next question
    const nextQuestion = getNextQuestion(state);

    if (!nextQuestion) {
      // OPTIMIZATION: Don't await completion - fire and forget
      completeInterview(interviewId).catch(console.error);

      return NextResponse.json({
        action: "complete",
        evaluation: {
          score: evaluation.score,
          reasoning: evaluation.reasoning,
        },
        message: "Interview completed. Thank you!",
      });
    }

    // OPTIMIZATION: Update current question in background (don't await)
    updateCurrentQuestion(interviewId, nextQuestion.id).catch(console.error);

    return NextResponse.json({
      action: "next_question",
      question: {
        id: nextQuestion.id,
        prompt: nextQuestion.prompt,
      },
      questionIndex: state.currentQuestionIndex + 1,
      totalQuestions: state.config.questions.length,
      evaluation: {
        score: evaluation.score,
        reasoning: evaluation.reasoning,
      },
    });
  } catch (error) {
    console.error("Next turn error:", error);
    return NextResponse.json(
      { error: "Failed to process turn" },
      { status: 500 }
    );
  }
}
