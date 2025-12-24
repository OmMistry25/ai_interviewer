import { NextRequest, NextResponse } from "next/server";
import {
  loadInterviewState,
  getCurrentQuestion,
  getNextQuestion,
  updateCurrentQuestion,
  completeInterview,
} from "@/lib/interview/orchestrator";
import {
  evaluateAnswer,
  shouldFollowUp,
  getFollowUpPrompt,
} from "@/lib/interview/evaluator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { interviewId, candidateAnswer, followupsUsed = 0 } = await request.json();

    if (!interviewId || !candidateAnswer) {
      return NextResponse.json(
        { error: "Interview ID and candidate answer required" },
        { status: 400 }
      );
    }

    const state = await loadInterviewState(interviewId);
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

    // Evaluate the answer
    const evaluation = await evaluateAnswer(
      currentQuestion,
      candidateAnswer,
      state.config
    );

    // Store the evaluation score for this question
    const adminClient = createSupabaseAdminClient();
    const questionId = currentQuestion.id;
    const signal = currentQuestion.rubric?.signal || "general";
    const weight = currentQuestion.rubric?.weight || 0.25;

    // Get or create evaluation record
    const { data: existingEval } = await adminClient
      .from("evaluations")
      .select("scores")
      .eq("interview_id", interviewId)
      .single();

    // Build scores structure
    const existingScores = (existingEval?.scores as {
      questionScores?: Record<string, number[]>;
      signalTotals?: Record<string, { total: number; count: number; weight: number }>;
    }) || {};

    // Store all scores per question (for transparency)
    const questionScores = existingScores.questionScores || {};
    if (!questionScores[questionId]) {
      questionScores[questionId] = [];
    }
    questionScores[questionId].push(evaluation.score);

    // Update signal aggregates (store raw totals, not calculated averages)
    const signalTotals = existingScores.signalTotals || {};
    if (!signalTotals[signal]) {
      signalTotals[signal] = { total: 0, count: 0, weight };
    }
    signalTotals[signal].total += evaluation.score;
    signalTotals[signal].count += 1;

    // Calculate display scores
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

    // Upsert evaluation (store both raw totals for accumulation AND calculated scores for display)
    await adminClient.from("evaluations").upsert(
      {
        interview_id: interviewId,
        scores: {
          totalScore,
          questionScores,
          signals,
          signalTotals, // Keep raw data for future accumulation
        },
      },
      { onConflict: "interview_id" }
    );

    const maxFollowups = state.config.policies?.max_followups_per_question ?? 1;

    // Check if we need a follow-up (Task 11.1)
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

    // Move to next question (Task 11.2)
    const nextQuestion = getNextQuestion(state);

    if (!nextQuestion) {
      // End interview after last question (Task 11.3)
      await completeInterview(interviewId);

      return NextResponse.json({
        action: "complete",
        evaluation: {
          score: evaluation.score,
          reasoning: evaluation.reasoning,
        },
        message: "Interview completed. Thank you!",
      });
    }

    // Advance to next question
    await updateCurrentQuestion(interviewId, nextQuestion.id);

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

