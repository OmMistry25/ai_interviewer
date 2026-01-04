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

Rules:
- "fit": Shows relevant experience/skills, positive signals, good potential
- "uncertain": Mixed signals, need more information
- "not_fit": Clear mismatch (e.g., no relevant experience AND no transferable skills, wrong expectations)

Be fair - someone without direct experience can still be "fit" if they show transferable skills, enthusiasm, and learning potential.

Only mark "not_fit" if there are multiple clear red flags.

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
 * Requires high confidence and "not_fit" status
 */
export function shouldExitGracefully(assessment: FitAssessment): boolean {
  return assessment.status === "not_fit" && assessment.confidence >= 0.7;
}

