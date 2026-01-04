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

