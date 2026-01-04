import { NextRequest, NextResponse } from "next/server";
import {
  loadInterviewState,
  getCurrentQuestion,
  getNextQuestion,
  updateCurrentQuestion,
  completeInterview,
  loadResumeContext,
  InterviewState,
  getNextScreeningQuestion,
  getExitQuestion,
  shouldCompleteInterview,
  updateDynamicState,
  addConversationTurn,
  InterviewPhase,
} from "@/lib/interview/orchestrator";
import {
  evaluateAnswer,
  shouldFollowUp,
  getFollowUpPrompt,
  ResumeContext,
} from "@/lib/interview/evaluator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateNextQuestion } from "@/lib/interview/question-generator";
import { assessCandidateFit, shouldExitGracefully } from "@/lib/interview/fit-assessor";

// Extend timeout for this route (Vercel Pro: 60s max)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { interviewId, candidateAnswer, followupsUsed = 0, currentQuestionPrompt } = await request.json();

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

    // Branch based on interview mode
    if (state.mode === "dynamic") {
      return handleDynamicFlow(state, candidateAnswer, resumeContext, currentQuestionPrompt);
    } else {
      return handleStaticFlow(state, candidateAnswer, resumeContext, followupsUsed);
    }
  } catch (error) {
    console.error("Next turn error:", error);
    return NextResponse.json(
      { error: "Failed to process turn" },
      { status: 500 }
    );
  }
}

// ============================================================
// STATIC MODE (Original Flow - Preserved)
// ============================================================

async function handleStaticFlow(
  state: InterviewState,
  candidateAnswer: string,
  resumeContext: ResumeContext | undefined,
  followupsUsed: number
) {
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
    state.config,
    resumeContext
  );

  // Fire-and-forget DB operations
  updateEvaluationScoresBackground(
    state.interviewId,
    currentQuestion.id,
    currentQuestion.rubric?.signal || "general",
    currentQuestion.rubric?.weight || 0.25,
    evaluation.score
  );

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
    completeInterview(state.interviewId).catch(console.error);

    return NextResponse.json({
      action: "complete",
      evaluation: {
        score: evaluation.score,
        reasoning: evaluation.reasoning,
      },
      message: "Interview completed. Thank you!",
    });
  }

  updateCurrentQuestion(state.interviewId, nextQuestion.id).catch(console.error);

  return NextResponse.json({
    action: "next_question",
    question: {
      id: nextQuestion.id,
      prompt: nextQuestion.prompt,
    },
    questionIndex: state.currentQuestionIndex + 1,
    totalQuestions: state.config.questions?.length || 0,
    evaluation: {
      score: evaluation.score,
      reasoning: evaluation.reasoning,
    },
  });
}

// ============================================================
// DYNAMIC MODE (New Flow)
// ============================================================

async function handleDynamicFlow(
  state: InterviewState,
  candidateAnswer: string,
  resumeContext: ResumeContext | undefined,
  currentQuestionPrompt?: string
) {
  const phase = state.phase || "screening";
  const questionsAsked = state.questionsAsked || 0;
  const exitQuestionsAsked = state.exitQuestionsAsked || 0;
  const config = state.config;
  const jobTitle = config.role_context?.job_title || "the position";
  const fitCriteria = config.fit_criteria || "Relevant experience and skills for the role";
  
  // Add conversation turn to history
  const questionPrompt = currentQuestionPrompt || "Previous question";
  const conversationHistory = await addConversationTurn(
    state.interviewId,
    state,
    questionPrompt,
    candidateAnswer
  );

  // Update questions asked count
  const newQuestionsAsked = questionsAsked + 1;

  // Assess fit after each answer (runs in parallel with next question generation when possible)
  const fitAssessmentPromise = assessCandidateFit(conversationHistory, fitCriteria, jobTitle);

  // Determine next action based on phase
  if (phase === "exit") {
    // In exit phase - just get next exit question or complete
    const newExitAsked = exitQuestionsAsked + 1;
    const nextExitQ = getExitQuestion({ ...state, exitQuestionsAsked: newExitAsked });

    await updateDynamicState(state.interviewId, {
      phase: "exit",
      questionsAsked: newQuestionsAsked,
      exitQuestionsAsked: newExitAsked,
      conversationHistory,
    });

    if (!nextExitQ) {
      completeInterview(state.interviewId).catch(console.error);
      return NextResponse.json({
        action: "complete",
        message: "Thank you for your time today! We appreciate you speaking with us.",
      });
    }

    return NextResponse.json({
      action: "next_question",
      question: {
        id: nextExitQ.id,
        prompt: nextExitQ.prompt,
      },
      phase: "exit",
    });
  }

  // Wait for fit assessment
  const fitAssessment = await fitAssessmentPromise;

  // Check if we should exit gracefully
  if (shouldExitGracefully(fitAssessment)) {
    // Switch to exit phase
    await updateDynamicState(state.interviewId, {
      phase: "exit",
      fitStatus: fitAssessment.status,
      questionsAsked: newQuestionsAsked,
      exitQuestionsAsked: 0,
      conversationHistory,
    });

    const exitQ = getExitQuestion({ ...state, exitQuestionsAsked: 0 });
    
    return NextResponse.json({
      action: "next_question",
      question: {
        id: exitQ?.id || "exit_1",
        prompt: exitQ?.prompt || "What interests you most about working in this role?",
      },
      phase: "exit",
      fitStatus: fitAssessment.status,
    });
  }

  // Determine next phase and question
  let nextPhase: InterviewPhase = phase;
  let nextQuestion: { id: string; prompt: string } | null = null;

  if (phase === "screening") {
    // Check if we have more screening questions
    const nextScreeningQ = getNextScreeningQuestion({ ...state, questionsAsked: newQuestionsAsked });
    
    if (nextScreeningQ) {
      nextQuestion = nextScreeningQ;
    } else {
      // Move to dynamic phase
      nextPhase = "dynamic";
    }
  }

  if (nextPhase === "dynamic" && !nextQuestion) {
    // Check if interview should complete (reached target questions)
    if (shouldCompleteInterview({ ...state, questionsAsked: newQuestionsAsked })) {
      // Don't wait for fit assessment - update state in background
      updateDynamicState(state.interviewId, {
        phase: "dynamic",
        fitStatus: fitAssessment.status,
        questionsAsked: newQuestionsAsked,
        conversationHistory,
      }).catch(console.error);

      completeInterview(state.interviewId).catch(console.error);

      return NextResponse.json({
        action: "complete",
        message: "Thank you for speaking with us today! We'll be in touch soon.",
        fitStatus: fitAssessment.status,
      });
    }

    // OPTIMIZATION: Generate question immediately, don't wait for fit assessment
    // Fit runs in parallel and we use current result (which started earlier)
    const totalTarget = config.role_context?.total_questions || 5;
    const remaining = totalTarget - newQuestionsAsked;
    
    nextQuestion = await generateNextQuestion(
      conversationHistory,
      config.role_context,
      resumeContext,
      remaining
    );
  }

  // OPTIMIZATION: Update state in background - don't block response
  updateDynamicState(state.interviewId, {
    phase: nextPhase,
    fitStatus: fitAssessment.status,
    questionsAsked: newQuestionsAsked,
    conversationHistory,
  }).catch(console.error);

  if (!nextQuestion) {
    // Fallback - shouldn't reach here
    completeInterview(state.interviewId).catch(console.error);
    return NextResponse.json({
      action: "complete",
      message: "Interview completed. Thank you!",
    });
  }

  return NextResponse.json({
    action: "next_question",
    question: {
      id: nextQuestion.id,
      prompt: nextQuestion.prompt,
    },
    phase: nextPhase,
    fitStatus: fitAssessment.status,
  });
}

// ============================================================
// SHARED HELPERS
// ============================================================

function updateEvaluationScoresBackground(
  interviewId: string,
  questionId: string,
  signal: string,
  weight: number,
  score: number
) {
  const adminClient = createSupabaseAdminClient();
  
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
      questionScores[questionId].push(score);

      const signalTotals = existingScores.signalTotals || {};
      if (!signalTotals[signal]) {
        signalTotals[signal] = { total: 0, count: 0, weight };
      }
      signalTotals[signal].total += score;
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
}
