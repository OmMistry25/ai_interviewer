import OpenAI from "openai";
import { env } from "@/lib/env";
import { Question, TemplateConfig } from "@/types/template";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Schema for evaluator output - simplified for faster parsing
const evaluatorOutputSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  needsFollowup: z.boolean(),
  followupReason: z.string().optional(),
});

export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;

// Resume analysis type for context
export interface ResumeContext {
  summary?: string;
  skills?: string[];
  relevant_experience?: string[];
  interview_focus_areas?: string[];
  suggested_questions?: string[];
  fit_score?: number;
  strengths?: string[];
  concerns?: string[];
}

// Compact signal descriptions
const SIGNAL_HINTS: Record<string, string> = {
  communication: "clarity, articulation, professionalism",
  experience: "relevance, depth, concrete achievements",
  motivation: "enthusiasm, alignment with role, authenticity",
  technical: "accuracy, problem-solving, best practices",
  general: "completeness, quality, specificity",
};

/**
 * Build optimized evaluator prompt (~500 tokens vs ~2000 before)
 */
export function buildEvaluatorPrompt(
  question: Question,
  candidateAnswer: string,
  config: TemplateConfig,
  resumeContext?: ResumeContext
): string {
  const signal = question.rubric?.signal || "general";
  const signalHint = SIGNAL_HINTS[signal] || SIGNAL_HINTS.general;
  
  // Build compact context (only essential info)
  let context = "";
  
  if (config.role_context?.job_title) {
    context += `Role: ${config.role_context.job_title}`;
    if (config.role_context.required_skills?.length) {
      context += ` | Skills needed: ${config.role_context.required_skills.slice(0, 5).join(", ")}`;
    }
    context += "\n";
  }
  
  if (resumeContext?.summary) {
    context += `Candidate: ${resumeContext.summary.slice(0, 150)}...\n`;
  }

  // Check for follow-up triggers
  const triggers = question.followups?.map(f => f.condition).join(", ") || "";

  return `Evaluate this interview answer. Score 0-1.

${context}Q: "${question.prompt}"
A: "${candidateAnswer}"

Signal: ${signal} (${signalHint})
${triggers ? `Follow-up if: ${triggers}` : ""}

Scoring: 0-0.3 poor, 0.4-0.6 average, 0.7-0.8 good, 0.9-1 excellent.
Higher scores for specific examples and role relevance.

JSON only: {"score":0.X,"reasoning":"1 sentence","needsFollowup":bool,"followupReason":"optional"}`;
}

/**
 * Call LLM evaluator with optimized settings
 */
export async function evaluateAnswer(
  question: Question,
  candidateAnswer: string,
  config: TemplateConfig,
  resumeContext?: ResumeContext
): Promise<EvaluatorOutput> {
  const prompt = buildEvaluatorPrompt(question, candidateAnswer, config, resumeContext);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2, // Lower for faster, more deterministic responses
    max_tokens: 150, // Limit output for speed
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from evaluator");
  }

  const parsed = JSON.parse(content);
  const result = evaluatorOutputSchema.safeParse(parsed);

  if (!result.success) {
    // Fallback for malformed responses
    return {
      score: 0.5,
      reasoning: "Evaluation parsing failed",
      needsFollowup: false,
    };
  }

  return result.data;
}

/**
 * Detect follow-up condition
 */
export function shouldFollowUp(
  evaluation: EvaluatorOutput,
  followupsUsed: number,
  maxFollowups: number
): boolean {
  if (followupsUsed >= maxFollowups) {
    return false;
  }
  return evaluation.needsFollowup;
}

/**
 * Get follow-up prompt based on condition
 */
export function getFollowUpPrompt(
  question: Question,
  followupReason?: string
): string | null {
  if (!question.followups?.length) {
    return null;
  }

  // Try to match the reason to a specific followup
  if (followupReason) {
    const matched = question.followups.find((f) =>
      followupReason.toLowerCase().includes(f.condition.toLowerCase())
    );
    if (matched) {
      return matched.prompt;
    }
  }

  // Default to first followup
  return question.followups[0].prompt;
}
