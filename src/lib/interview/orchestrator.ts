import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateConfig, Question } from "@/types/template";
import { ResumeContext } from "./evaluator";

export interface InterviewState {
  interviewId: string;
  config: TemplateConfig;
  currentQuestionIndex: number;
  currentFollowupIndex: number;
  status: "scheduled" | "live" | "completed";
}

/**
 * Load interview with template config
 */
export async function loadInterviewState(
  interviewId: string
): Promise<InterviewState | null> {
  const adminClient = createSupabaseAdminClient();

  // Get interview with template version
  const { data: interview } = await adminClient
    .from("interviews")
    .select("id, status, current_question_id, template_version_id")
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

  // Determine current question index from question_id
  let currentQuestionIndex = 0;
  if (interview.current_question_id) {
    const idx = config.questions.findIndex(
      (q) => q.id === interview.current_question_id
    );
    if (idx >= 0) currentQuestionIndex = idx;
  }

  return {
    interviewId: interview.id,
    config,
    currentQuestionIndex,
    currentFollowupIndex: 0,
    status: interview.status as InterviewState["status"],
  };
}

/**
 * Get current question from state
 */
export function getCurrentQuestion(state: InterviewState): Question | null {
  if (state.currentQuestionIndex >= state.config.questions.length) {
    return null;
  }
  return state.config.questions[state.currentQuestionIndex];
}

/**
 * Get next question (or null if done)
 */
export function getNextQuestion(state: InterviewState): Question | null {
  const nextIndex = state.currentQuestionIndex + 1;
  if (nextIndex >= state.config.questions.length) {
    return null;
  }
  return state.config.questions[nextIndex];
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
 * Mark interview as completed
 */
export async function completeInterview(interviewId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("interviews")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", interviewId);
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

