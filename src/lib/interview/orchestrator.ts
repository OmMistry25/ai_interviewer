import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateConfig, Question, getInterviewMode } from "@/types/template";
import { ResumeContext } from "./evaluator";
import { ConversationTurn } from "./question-generator";
import { FitStatus } from "./fit-assessor";

// Interview phase for dynamic mode
export type InterviewPhase = "screening" | "dynamic" | "exit";

// Base interview state (shared between modes)
export interface InterviewState {
  interviewId: string;
  config: TemplateConfig;
  currentQuestionIndex: number;
  currentFollowupIndex: number;
  status: "scheduled" | "live" | "completed";
  // Dynamic mode fields
  mode: "static" | "dynamic";
  phase?: InterviewPhase;
  conversationHistory?: ConversationTurn[];
  questionsAsked?: number;
  exitQuestionsAsked?: number;
  fitStatus?: FitStatus;
}

/**
 * Load interview with template config
 */
export async function loadInterviewState(
  interviewId: string
): Promise<InterviewState | null> {
  const adminClient = createSupabaseAdminClient();

  // Get interview with template version and dynamic state
  const { data: interview } = await adminClient
    .from("interviews")
    .select("id, status, current_question_id, template_version_id, dynamic_state")
    .eq("id", interviewId)
    .single();

  if (!interview) return null;

  // Get template version config
  const { data: version } = await adminClient
    .from("interview_template_versions")
    .select("config")
    .eq("id", interview.template_version_id)
    .single();

  if (!version) return null;

  const config = version.config as TemplateConfig;
  const mode = getInterviewMode(config);

  // For static mode: determine current question index from question_id
  let currentQuestionIndex = 0;
  if (mode === "static" && interview.current_question_id && config.questions) {
    const idx = config.questions.findIndex(
      (q) => q.id === interview.current_question_id
    );
    if (idx >= 0) currentQuestionIndex = idx;
  }

  // Load dynamic state if present
  const dynamicState = interview.dynamic_state as {
    phase?: InterviewPhase;
    conversationHistory?: ConversationTurn[];
    questionsAsked?: number;
    exitQuestionsAsked?: number;
    fitStatus?: FitStatus;
  } | null;

  return {
    interviewId: interview.id,
    config,
    currentQuestionIndex,
    currentFollowupIndex: 0,
    status: interview.status as InterviewState["status"],
    mode,
    // Dynamic mode state
    phase: dynamicState?.phase || "screening",
    conversationHistory: dynamicState?.conversationHistory || [],
    questionsAsked: dynamicState?.questionsAsked || 0,
    exitQuestionsAsked: dynamicState?.exitQuestionsAsked || 0,
    fitStatus: dynamicState?.fitStatus,
  };
}

/**
 * Get current question from state (static mode only)
 */
export function getCurrentQuestion(state: InterviewState): Question | null {
  if (!state.config.questions) return null;
  if (state.currentQuestionIndex >= state.config.questions.length) {
    return null;
  }
  return state.config.questions[state.currentQuestionIndex];
}

/**
 * Get next question (or null if done) (static mode only)
 */
export function getNextQuestion(state: InterviewState): Question | null {
  if (!state.config.questions) return null;
  const nextIndex = state.currentQuestionIndex + 1;
  if (nextIndex >= state.config.questions.length) {
    return null;
  }
  return state.config.questions[nextIndex];
}

// ============================================================
// DYNAMIC MODE FUNCTIONS
// ============================================================

/**
 * Get the next screening question (dynamic mode)
 */
export function getNextScreeningQuestion(state: InterviewState): { id: string; prompt: string } | null {
  const screeningQuestions = state.config.screening_questions;
  if (!screeningQuestions) return null;
  
  const asked = state.questionsAsked || 0;
  if (asked >= screeningQuestions.length) {
    return null; // All screening questions asked
  }
  
  return screeningQuestions[asked];
}

/**
 * Get an exit question (dynamic mode)
 */
export function getExitQuestion(state: InterviewState): { id: string; prompt: string } | null {
  const exitQuestions = state.config.exit_questions;
  const maxExitQuestions = state.config.policies?.max_exit_questions || 2;
  const exitAsked = state.exitQuestionsAsked || 0;
  
  if (exitAsked >= maxExitQuestions) {
    return null; // Done with exit questions
  }
  
  if (exitQuestions && exitAsked < exitQuestions.length) {
    return exitQuestions[exitAsked];
  }
  
  // Default exit questions if not specified
  if (exitAsked === 0) {
    return { id: "exit_interest", prompt: "What interests you most about working in this role?" };
  }
  return { id: "exit_closing", prompt: "Is there anything else you'd like us to know about you?" };
}

/**
 * Check if interview should complete based on questions asked
 */
export function shouldCompleteInterview(state: InterviewState): boolean {
  if (state.mode !== "dynamic") return false;
  
  const totalQuestions = state.config.role_context?.total_questions || 5;
  const asked = state.questionsAsked || 0;
  
  return asked >= totalQuestions;
}

/**
 * Update dynamic interview state in database
 */
export async function updateDynamicState(
  interviewId: string,
  updates: {
    phase?: InterviewPhase;
    conversationHistory?: ConversationTurn[];
    questionsAsked?: number;
    exitQuestionsAsked?: number;
    fitStatus?: FitStatus;
  }
): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  
  // Get current dynamic state
  const { data: interview } = await adminClient
    .from("interviews")
    .select("dynamic_state")
    .eq("id", interviewId)
    .single();
  
  const currentState = (interview?.dynamic_state as object) || {};
  
  // Merge updates
  const newState = {
    ...currentState,
    ...updates,
  };
  
  await adminClient
    .from("interviews")
    .update({ dynamic_state: newState })
    .eq("id", interviewId);
}

/**
 * Add a conversation turn to history
 */
export async function addConversationTurn(
  interviewId: string,
  state: InterviewState,
  question: string,
  answer: string
): Promise<ConversationTurn[]> {
  const history = [...(state.conversationHistory || [])];
  history.push({ question, answer });
  
  await updateDynamicState(interviewId, { conversationHistory: history });
  
  return history;
}

/**
 * Update interview's current question
 */
export async function updateCurrentQuestion(
  interviewId: string,
  questionId: string
): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("interviews")
    .update({ current_question_id: questionId })
    .eq("id", interviewId);
}

/**
 * Mark interview as live
 */
export async function startInterview(interviewId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("interviews")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", interviewId);
}

/**
 * Mark interview as completed and save transcript/scores
 */
export async function completeInterview(interviewId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  // Get transcript from interview_turns
  const { data: turns } = await adminClient
    .from("interview_turns")
    .select("speaker, transcript, created_at")
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: true });

  // Format transcript as array of messages
  const transcript = (turns || []).map((turn) => ({
    role: turn.speaker === "ai" ? "assistant" : "user",
    content: turn.transcript,
  }));

  // Get scores from evaluations
  const { data: evaluation } = await adminClient
    .from("evaluations")
    .select("scores")
    .eq("interview_id", interviewId)
    .single();

  const scores = evaluation?.scores || null;

  // Generate a simple summary from the scores
  let summary: string | null = null;
  if (scores && typeof scores === "object") {
    const scoresObj = scores as { totalScore?: number; signals?: Record<string, { score: number }> };
    const totalScore = scoresObj.totalScore ?? 0;
    const signals = scoresObj.signals || {};
    
    const signalSummary = Object.entries(signals)
      .map(([name, data]) => `${name}: ${Math.round(data.score * 100)}%`)
      .join(", ");
    
    summary = `Overall Score: ${Math.round(totalScore * 100)}%\n\nSignal Breakdown: ${signalSummary || "No signals recorded"}`;
  }

  // Update interview with all data
  await adminClient
    .from("interviews")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      transcript,
      scores,
      summary,
    })
    .eq("id", interviewId);

  // Also update linked application status to "interviewed"
  const { data: interview } = await adminClient
    .from("interviews")
    .select("application_id")
    .eq("id", interviewId)
    .single();

  if (interview?.application_id) {
    await adminClient
      .from("applications")
      .update({ status: "interviewed" })
      .eq("id", interview.application_id);
  }
}

/**
 * Load resume context for an interview (if linked to an application)
 */
export async function loadResumeContext(
  interviewId: string
): Promise<ResumeContext | undefined> {
  const adminClient = createSupabaseAdminClient();

  // Get interview with application
  const { data: interview } = await adminClient
    .from("interviews")
    .select("application_id")
    .eq("id", interviewId)
    .single();

  if (!interview?.application_id) {
    return undefined;
  }

  // Get application with resume analysis
  const { data: application } = await adminClient
    .from("applications")
    .select("resume_analysis")
    .eq("id", interview.application_id)
    .single();

  if (!application?.resume_analysis) {
    return undefined;
  }

  // Return relevant fields for evaluation context
  const analysis = application.resume_analysis as any;
  return {
    summary: analysis.summary,
    skills: analysis.skills,
    relevant_experience: analysis.relevant_experience,
    interview_focus_areas: analysis.interview_focus_areas,
    suggested_questions: analysis.suggested_questions,
    fit_score: analysis.fit_score,
    strengths: analysis.strengths,
    concerns: analysis.concerns,
  };
}

