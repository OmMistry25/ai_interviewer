/**
 * Real-time fit assessment for dynamic interviews
 * Evaluates candidate fit based on conversation history and fit criteria
 */

import OpenAI from "openai";
import { env } from "@/lib/env";
import { ConversationTurn } from "./question-generator";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export type FitStatus = "fit" | "uncertain" | "not_fit";

export interface FitAssessment {
  status: FitStatus;
  reason: string;
  confidence: number; // 0-1
}

/**
 * Assess candidate fit based on conversation so far
 */
export async function assessCandidateFit(
  conversationHistory: ConversationTurn[],
  fitCriteria: string,
  jobTitle: string
): Promise<FitAssessment> {
  // Don't assess until we have at least 2 Q&A pairs
  if (conversationHistory.length < 2) {
    return {
      status: "uncertain",
      reason: "Need more information to assess fit",
      confidence: 0.3,
    };
  }

  // Build compact conversation summary
  const conversationSummary = conversationHistory
    .map((turn, i) => `Q: ${turn.question}\nA: ${turn.answer}`)
    .join("\n\n");

  const prompt = `Assess candidate fit for: ${jobTitle}

Fit criteria: ${fitCriteria}

Conversation:
${conversationSummary}

Based on the conversation, assess if this candidate is a fit.

IMPORTANT - Be generous and encouraging:
- "fit": Shows ANY relevant experience, transferable skills, enthusiasm, willingness to learn, or positive attitude
- "uncertain": Mixed signals but showing effort or potential - default to this if unsure
- "not_fit": ONLY use for extreme cases - candidate explicitly refuses job duties, is hostile, or shows zero interest

Key rules:
1. Transferable skills count heavily (e.g., engineering skills apply to tech roles, retail experience applies to customer service)
2. Enthusiasm and willingness to learn can compensate for lack of direct experience
3. Give candidates the benefit of the doubt - we can train skills but not attitude
4. Entry-level roles should NOT require experience

NEVER mark "not_fit" just because someone lacks direct experience. Most great hires come from adjacent fields.

Respond with JSON only:
{"status": "fit|uncertain|not_fit", "reason": "brief reason (1 sentence)", "confidence": 0.0-1.0}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fair hiring assessor. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        status: "uncertain",
        reason: "Unable to parse assessment",
        confidence: 0.5,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate status
    const validStatuses: FitStatus[] = ["fit", "uncertain", "not_fit"];
    const status: FitStatus = validStatuses.includes(parsed.status) 
      ? parsed.status 
      : "uncertain";

    return {
      status,
      reason: parsed.reason || "No reason provided",
      confidence: typeof parsed.confidence === "number" 
        ? Math.min(1, Math.max(0, parsed.confidence)) 
        : 0.5,
    };
  } catch (error) {
    console.error("Fit assessment error:", error);
    return {
      status: "uncertain",
      reason: "Assessment error - continuing interview",
      confidence: 0.5,
    };
  }
}

/**
 * Determine if we should exit gracefully based on fit assessment
 * Requires VERY high confidence and "not_fit" status
 * This should rarely trigger - only for extreme mismatch cases
 */
export function shouldExitGracefully(assessment: FitAssessment): boolean {
  // Require 90% confidence to exit early - we almost never want to do this
  return assessment.status === "not_fit" && assessment.confidence >= 0.9;
}

