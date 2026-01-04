/**
 * Dynamic question generator for AI-driven interviews
 * Generates contextual follow-up questions based on conversation history
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
 */
export async function generateNextQuestion(
  conversationHistory: ConversationTurn[],
  roleContext: RoleContext | undefined,
  resumeContext: ResumeContext | undefined,
  questionsRemaining: number
): Promise<GeneratedQuestion> {
  const jobTitle = roleContext?.job_title || "the position";
  const keySkills = roleContext?.key_skills || roleContext?.required_skills || [];
  const idealCandidate = roleContext?.ideal_candidate || "";
  
  // Build compact conversation summary
  const conversationSummary = conversationHistory
    .map((turn, i) => `Q${i + 1}: ${turn.question}\nA${i + 1}: ${turn.answer}`)
    .join("\n\n");
  
  // Build resume context hint
  let resumeHint = "";
  if (resumeContext?.summary) {
    resumeHint = `\nCandidate background: ${resumeContext.summary.slice(0, 150)}`;
  }
  
  // Build the prompt
  const prompt = `You are interviewing for: ${jobTitle}
${keySkills.length > 0 ? `Key skills: ${keySkills.slice(0, 5).join(", ")}` : ""}
${idealCandidate ? `Looking for: ${idealCandidate}` : ""}${resumeHint}

Conversation so far:
${conversationSummary}

Generate the next interview question. You have ${questionsRemaining} questions remaining.

Guidelines:
- Build on what the candidate has shared
- Explore gaps or interesting points from their answers
- Keep it conversational and natural
- Focus on skills/experience relevant to the role
- Don't repeat topics already covered

Respond with ONLY the question text, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional interviewer. Generate concise, relevant interview questions.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  const questionText = response.choices[0]?.message?.content?.trim() || 
    "Tell me more about your relevant experience for this role.";

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

