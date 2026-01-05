/**
 * Dynamic question generator for AI-driven interviews
 * Generates contextual follow-up questions based on conversation history
 * Optimized for speed with compact prompts and streaming
 */

import OpenAI from "openai";
import { env } from "@/lib/env";
import { RoleContext } from "@/types/template";
import { ResumeContext } from "./evaluator";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface ConversationTurn {
  question: string;
  answer: string;
}

interface GeneratedQuestion {
  prompt: string;
  id: string;
}

/**
 * Generate the next interview question dynamically based on conversation
 * OPTIMIZED: Uses streaming to get first tokens faster
 */
export async function generateNextQuestion(
  conversationHistory: ConversationTurn[],
  roleContext: RoleContext | undefined,
  resumeContext: ResumeContext | undefined,
  questionsRemaining: number
): Promise<GeneratedQuestion> {
  const jobTitle = roleContext?.job_title || "the position";
  const keySkills = roleContext?.key_skills || roleContext?.required_skills || [];
  
  // OPTIMIZATION: Compact conversation - only last 2-3 exchanges for context
  const recentHistory = conversationHistory.slice(-3);
  const conversationSummary = recentHistory
    .map((turn) => `Q: ${turn.question.slice(0, 100)}\nA: ${turn.answer.slice(0, 200)}`)
    .join("\n");
  
  // OPTIMIZATION: Minimal resume hint
  const resumeHint = resumeContext?.summary 
    ? `Background: ${resumeContext.summary.slice(0, 100)}` 
    : "";
  
  // OPTIMIZATION: Ultra-compact prompt (~150 tokens)
  const prompt = `Role: ${jobTitle}${keySkills.length > 0 ? ` | Skills: ${keySkills.slice(0, 3).join(", ")}` : ""}
${resumeHint}

Recent:
${conversationSummary}

Next question (${questionsRemaining} left). Build on their answer. Be conversational. Question only:`;

  // Use streaming to get the response faster
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Generate one short interview question. No preamble.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 80, // Reduced - questions should be short
    temperature: 0.7,
    stream: true,
  });

  // Collect streamed tokens
  let questionText = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      questionText += content;
    }
  }

  questionText = questionText.trim() || "Tell me more about your experience.";

  return {
    prompt: questionText,
    id: `dynamic_${Date.now()}`,
  };
}

/**
 * Generate a contextual closing question for graceful exit
 */
export async function generateClosingQuestion(
  conversationHistory: ConversationTurn[],
  roleContext: RoleContext | undefined,
  isFirstExitQuestion: boolean
): Promise<GeneratedQuestion> {
  const jobTitle = roleContext?.job_title || "this position";
  
  // For the first exit question, ask about interest/motivation
  // For the second, ask for anything else to share
  if (isFirstExitQuestion) {
    return {
      prompt: `What interests you most about working in this role?`,
      id: "exit_interest",
    };
  }
  
  return {
    prompt: "Is there anything else you'd like us to know about you?",
    id: "exit_closing",
  };
}

/**
 * Winding down questions - lighter, more conversational
 * Used when we want to gracefully shorten the interview without being abrupt
 */
const WINDING_DOWN_QUESTIONS = [
  {
    id: "wd_goals",
    prompt: "What are you hoping to learn or achieve in your next role?",
  },
  {
    id: "wd_strengths",
    prompt: "What do you consider your biggest strength?",
  },
  {
    id: "wd_teamwork",
    prompt: "Can you tell me about a time you worked well in a team?",
  },
  {
    id: "wd_challenges",
    prompt: "What's a challenge you've overcome that you're proud of?",
  },
  {
    id: "wd_interest",
    prompt: "What drew you to apply for this position?",
  },
];

/**
 * Get a winding down question (lighter, more general questions)
 * These are used before final exit to make the interview feel complete
 */
export function getWindingDownQuestion(
  windingDownQuestionsAsked: number
): GeneratedQuestion | null {
  // Only ask 2 winding down questions
  if (windingDownQuestionsAsked >= 2) {
    return null;
  }
  
  // Pick questions in order, wrapping if needed
  const question = WINDING_DOWN_QUESTIONS[windingDownQuestionsAsked % WINDING_DOWN_QUESTIONS.length];
  return question;
}

/**
 * Generic closing statement question
 */
export function getFinalClosingQuestion(): GeneratedQuestion {
  return {
    id: "final_closing",
    prompt: "Is there anything else you'd like us to know about you before we wrap up?",
  };
}

/**
 * Determine if a follow-up question is needed based on the answer
 * Uses fast heuristics only - no AI call for speed
 */
export function shouldAskFollowUp(
  question: string,
  answer: string,
  roleContext: RoleContext | undefined
): { shouldFollowUp: boolean; reason: string } {
  const wordCount = answer.trim().split(/\s+/).length;
  const answerLower = answer.toLowerCase();
  
  // Very short answers (< 15 words) need follow-up
  if (wordCount < 15) {
    return { shouldFollowUp: true, reason: "Answer was brief" };
  }
  
  // Check for vague/non-committal answers
  const vaguePatterns = [
    /^(yes|no|maybe|i guess|not really|i don't know|idk|nope|yep)\.?$/i,
    /^(i think so|probably|possibly|sometimes)\.?$/i,
  ];
  
  if (vaguePatterns.some(pattern => pattern.test(answer.trim()))) {
    return { shouldFollowUp: true, reason: "Answer was vague" };
  }
  
  // Check if answer contains specific examples (good sign - no follow-up needed)
  const hasSpecifics = /\d+|when i|one time|for example|at my|last year|recently/i.test(answerLower);
  if (hasSpecifics && wordCount > 25) {
    return { shouldFollowUp: false, reason: "Answer included specifics" };
  }
  
  // Medium-length answers (15-40 words) without specifics - follow up
  if (wordCount < 40 && !hasSpecifics) {
    return { shouldFollowUp: true, reason: "Could use more detail" };
  }
  
  // Detailed answers (40+ words) - no follow-up needed
  return { shouldFollowUp: false, reason: "Answer was comprehensive" };
}

/**
 * Generate a contextual follow-up question based on the answer
 * Used in hybrid mode when allow_followup is true
 */
export async function generateFollowUpQuestion(
  originalQuestion: string,
  answer: string,
  roleContext: RoleContext | undefined
): Promise<GeneratedQuestion> {
  const jobTitle = roleContext?.job_title || "the position";
  
  const prompt = `Original question: "${originalQuestion}"
Candidate's answer: "${answer}"

Generate ONE short follow-up question that:
- Asks for more detail or a specific example
- Helps assess their fit for ${jobTitle}
- Is conversational and natural
- Does NOT repeat what was already asked

Just output the follow-up question, nothing else.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate one short follow-up interview question. No preamble." },
        { role: "user", content: prompt },
      ],
      max_tokens: 60,
      temperature: 0.6,
    });

    const questionText = response.choices[0]?.message?.content?.trim() || 
      "Can you give me a specific example of that?";

    return {
      prompt: questionText,
      id: `followup_${Date.now()}`,
    };
  } catch (e) {
    console.error("Follow-up generation error:", e);
    return {
      prompt: "Can you tell me more about that?",
      id: `followup_${Date.now()}`,
    };
  }
}

