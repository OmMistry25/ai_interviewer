import OpenAI from "openai";
import { env } from "@/lib/env";
import { Question } from "@/types/template";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Schema for evaluator output
const evaluatorOutputSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  needsFollowup: z.boolean(),
  followupReason: z.string().optional(),
});

export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;

/**
 * Build evaluator prompt (Task 10.1)
 */
export function buildEvaluatorPrompt(
  question: Question,
  candidateAnswer: string,
  systemPrompt: string
): string {
  const rubricInfo = question.rubric
    ? `\nRubric Signal: ${question.rubric.signal}\nWeight: ${question.rubric.weight}`
    : "";

  const followupConditions = question.followups?.length
    ? `\nFollow-up conditions: ${question.followups.map((f) => f.condition).join(", ")}`
    : "";

  return `${systemPrompt}

You are evaluating a candidate's answer in an interview.

Question asked: "${question.prompt}"
${rubricInfo}
${followupConditions}

Candidate's answer: "${candidateAnswer}"

Evaluate the answer and respond with a JSON object containing:
- score: number between 0 and 1 (how well they answered)
- reasoning: brief explanation of the score
- needsFollowup: boolean (true if answer is vague, incomplete, or matches a follow-up condition)
- followupReason: if needsFollowup is true, which condition triggered it

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Call LLM evaluator (Task 10.2)
 */
export async function evaluateAnswer(
  question: Question,
  candidateAnswer: string,
  systemPrompt: string
): Promise<EvaluatorOutput> {
  const prompt = buildEvaluatorPrompt(question, candidateAnswer, systemPrompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from evaluator");
  }

  // Parse and validate output (Task 10.3)
  const parsed = JSON.parse(content);
  const result = evaluatorOutputSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid evaluator output: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Detect follow-up condition (Task 10.4)
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

