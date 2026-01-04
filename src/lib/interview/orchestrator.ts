import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateConfig, Question, getInterviewMode } from "@/types/template";
import { ResumeContext } from "./evaluator";
import { ConversationTurn } from "./question-generator";
import { FitStatus } from "./fit-assessor";
import OpenAI from "openai";
import { env } from "@/lib/env";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Interview phase for dynamic mode
// "winding_down" = gradual exit, asking 2 more light questions before ending
export type InterviewPhase = "screening" | "dynamic" | "winding_down" | "exit";

// Base interview state (shared between modes)
export interface InterviewState {
  interviewId: string;
  config: TemplateConfig;
  currentQuestionIndex: number;
  currentFollowupIndex: number;
  status: "scheduled" | "live" | "completed";
  // Mode: static (fixed), hybrid (fixed Q + AI follow-ups), dynamic (all AI)
  mode: "static" | "hybrid" | "dynamic";
  phase?: InterviewPhase;
  conversationHistory?: ConversationTurn[];
  questionsAsked?: number;
  exitQuestionsAsked?: number;
  windingDownQuestionsAsked?: number; // Track questions in winding_down phase
  fitStatus?: FitStatus;
  // Hybrid mode: track if we just asked a follow-up for current question
  askedFollowUp?: boolean;
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
    windingDownQuestionsAsked?: number;
    fitStatus?: FitStatus;
    currentQuestionIndex?: number;
    askedFollowUp?: boolean;
  } | null;

  // For hybrid mode, get currentQuestionIndex from dynamic state
  if (mode === "hybrid" && dynamicState?.currentQuestionIndex !== undefined) {
    currentQuestionIndex = dynamicState.currentQuestionIndex;
  }

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
    windingDownQuestionsAsked: dynamicState?.windingDownQuestionsAsked || 0,
    fitStatus: dynamicState?.fitStatus,
    askedFollowUp: dynamicState?.askedFollowUp || false,
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
    windingDownQuestionsAsked?: number;
    fitStatus?: FitStatus;
    currentQuestionIndex?: number;
    askedFollowUp?: boolean;
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

  // Get interview to check mode and dynamic state
  const { data: interviewData } = await adminClient
    .from("interviews")
    .select("template_version_id, dynamic_state")
    .eq("id", interviewId)
    .single();

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

  // Get scores from evaluations (for static mode)
  let { data: evaluation } = await adminClient
    .from("evaluations")
    .select("scores")
    .eq("interview_id", interviewId)
    .single();

  let scores = evaluation?.scores || null;

  // For dynamic mode: Generate scores if not already present
  const dynamicState = interviewData?.dynamic_state as { conversationHistory?: ConversationTurn[] } | null;
  if (!scores && dynamicState?.conversationHistory && dynamicState.conversationHistory.length > 0) {
    try {
      scores = await generateDynamicScores(dynamicState.conversationHistory);
      
      // Save to evaluations table
      await adminClient.from("evaluations").upsert(
        { interview_id: interviewId, scores },
        { onConflict: "interview_id" }
      );
    } catch (e) {
      console.error("Failed to generate dynamic scores:", e);
    }
  }

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

/**
 * Generate interview scores for dynamic mode interviews
 * Analyzes conversation history to produce signal-based scores
 */
async function generateDynamicScores(
  conversationHistory: ConversationTurn[]
): Promise<{
  totalScore: number;
  signals: Record<string, { score: number; weight: number }>;
}> {
  const conversationText = conversationHistory
    .map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`)
    .join("\n\n");

  const prompt = `Evaluate this interview conversation objectively. Score each signal from 0.0 to 1.0 based on evidence in the answers.

Conversation:
${conversationText}

Score these signals based on ACTUAL evidence in responses:

1. communication (0.0-1.0): Did they articulate clearly? Give detailed responses? Listen and respond appropriately?
   - Low (0.1-0.3): One-word answers, unclear, doesn't address questions
   - Medium (0.4-0.6): Adequate answers but lacks depth
   - High (0.7-1.0): Clear, detailed, well-structured responses

2. enthusiasm (0.0-1.0): Did they show genuine interest and energy?
   - Low (0.1-0.3): Flat, minimal effort, disinterested tone
   - Medium (0.4-0.6): Polite but not excited
   - High (0.7-1.0): Genuine excitement, asks questions, shows passion

3. relevant_experience (0.0-1.0): Did they demonstrate applicable skills or experience?
   - Low (0.1-0.3): No relevant examples given
   - Medium (0.4-0.6): Some transferable skills mentioned
   - High (0.7-1.0): Strong, specific relevant examples

4. problem_solving (0.0-1.0): Did they show analytical thinking with concrete examples?
   - Low (0.1-0.3): Vague or no examples, can't explain approach
   - Medium (0.4-0.6): Basic examples without depth
   - High (0.7-1.0): Specific situations with clear problem-solving approach

5. cultural_fit (0.0-1.0): Did they show professionalism, teamwork orientation?
   - Low (0.1-0.3): Unprofessional responses, negative attitude
   - Medium (0.4-0.6): Adequate professionalism
   - High (0.7-1.0): Positive, team-oriented, professional throughout

IMPORTANT: Score based on what was ACTUALLY demonstrated. Short, vague answers = low scores. "No" or refusal to answer = very low.

Respond with JSON only:
{"communication": 0.X, "enthusiasm": 0.X, "relevant_experience": 0.X, "problem_solving": 0.X, "cultural_fit": 0.X}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an objective interview evaluator. Score based only on evidence in the conversation. Short or vague answers get low scores. Respond with JSON only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }

    const rawScores = JSON.parse(jsonMatch[0]) as Record<string, number>;
    
    // Build signals with equal weights
    const signals: Record<string, { score: number; weight: number }> = {};
    const signalNames = ["communication", "enthusiasm", "relevant_experience", "problem_solving", "cultural_fit"];
    
    let totalWeighted = 0;
    let totalWeight = 0;
    
    for (const name of signalNames) {
      const score = typeof rawScores[name] === "number" 
        ? Math.min(1, Math.max(0, rawScores[name])) 
        : 0.5;
      signals[name] = { score, weight: 0.2 };
      totalWeighted += score * 0.2;
      totalWeight += 0.2;
    }

    const totalScore = totalWeight > 0 ? totalWeighted / totalWeight : 0.5;

    return { totalScore, signals };
  } catch (e) {
    console.error("Failed to generate dynamic scores:", e);
    // Return neutral scores on error
    return {
      totalScore: 0.5,
      signals: {
        communication: { score: 0.5, weight: 0.2 },
        enthusiasm: { score: 0.5, weight: 0.2 },
        relevant_experience: { score: 0.5, weight: 0.2 },
        problem_solving: { score: 0.5, weight: 0.2 },
        cultural_fit: { score: 0.5, weight: 0.2 },
      },
    };
  }
}

