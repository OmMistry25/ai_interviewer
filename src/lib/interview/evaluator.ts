import OpenAI from "openai";
import { env } from "@/lib/env";
import { Question, TemplateConfig } from "@/types/template";
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

// Signal descriptions for evaluation criteria
const SIGNAL_CRITERIA: Record<string, string> = {
  communication: `
    - Clarity: Is the answer clear and well-structured?
    - Articulation: Does the candidate express ideas effectively?
    - Conciseness: Is the answer appropriately detailed without rambling?
    - Professionalism: Is the tone and language professional?`,
  experience: `
    - Relevance: Does the experience relate to the question/role?
    - Depth: Does the candidate show genuine hands-on experience?
    - Impact: Did they describe concrete outcomes or achievements?
    - Growth: Does their experience show progression?`,
  motivation: `
    - Enthusiasm: Does the candidate show genuine interest?
    - Alignment: Do their goals align with the role/company?
    - Research: Do they show understanding of the opportunity?
    - Authenticity: Does their motivation seem genuine, not rehearsed?`,
  technical: `
    - Accuracy: Is the technical content correct?
    - Depth: Do they show deep understanding vs surface knowledge?
    - Problem-solving: Can they explain their approach to challenges?
    - Best practices: Do they mention industry standards?`,
  general: `
    - Completeness: Did they fully address the question?
    - Quality: Is the answer thoughtful and relevant?
    - Specificity: Did they provide concrete examples?`,
};

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

/**
 * Build evaluator prompt (Task 10.1)
 */
export function buildEvaluatorPrompt(
  question: Question,
  candidateAnswer: string,
  config: TemplateConfig,
  resumeContext?: ResumeContext
): string {
  const signal = question.rubric?.signal || "general";
  const criteria = SIGNAL_CRITERIA[signal] || SIGNAL_CRITERIA.general;
  const roleContext = config.role_context;

  const followupConditions = question.followups?.length
    ? `\nFollow-up triggers: ${question.followups.map((f) => `"${f.condition}"`).join(", ")}`
    : "";

  // Build role context section
  let roleSection = "";
  if (roleContext) {
    roleSection = `
## Role Context
- **Position:** ${roleContext.job_title}${roleContext.level ? ` (${roleContext.level})` : ""}
${roleContext.department ? `- **Department:** ${roleContext.department}` : ""}
${roleContext.required_skills?.length ? `- **Required Skills:** ${roleContext.required_skills.join(", ")}` : ""}
${roleContext.preferred_experience ? `- **Expected Experience:** ${roleContext.preferred_experience}` : ""}
${roleContext.company_context ? `- **Company Context:** ${roleContext.company_context}` : ""}
${roleContext.evaluation_notes ? `- **Evaluation Notes:** ${roleContext.evaluation_notes}` : ""}

Use this context to judge if the candidate's experience and answers are RELEVANT to this specific role.
`;
  }

  // Build resume context section
  let resumeSection = "";
  if (resumeContext) {
    resumeSection = `
## Candidate Background (from resume)
${resumeContext.summary ? `- **Summary:** ${resumeContext.summary}` : ""}
${resumeContext.skills?.length ? `- **Skills:** ${resumeContext.skills.join(", ")}` : ""}
${resumeContext.relevant_experience?.length ? `- **Relevant Experience:** ${resumeContext.relevant_experience.join("; ")}` : ""}
${resumeContext.strengths?.length ? `- **Strengths:** ${resumeContext.strengths.join(", ")}` : ""}
${resumeContext.concerns?.length ? `- **Concerns to Address:** ${resumeContext.concerns.join(", ")}` : ""}

Use this background to:
1. Verify if their verbal answers align with their resume claims
2. Give higher scores when they expand on resume experience with specific details
3. Note any discrepancies between resume and verbal answers
`;
  }

  return `${config.system_prompt}

You are evaluating a candidate's answer in an interview.
${roleSection}${resumeSection}
## Question
"${question.prompt}"

## Candidate's Answer
"${candidateAnswer}"

## Evaluation Criteria (Signal: ${signal})
${criteria}

## Scoring Guide
- 0.0-0.2: Poor - Answer is off-topic, incoherent, or shows red flags
- 0.3-0.4: Below Average - Answer is vague, lacks substance, or not relevant to the role
- 0.5-0.6: Average - Acceptable answer but nothing impressive
- 0.7-0.8: Good - Solid answer with specific examples and clear relevance to the role
- 0.9-1.0: Excellent - Outstanding answer that exceeds expectations and shows strong fit
${followupConditions}

## Instructions
Evaluate the answer based on the criteria above AND the role context (if provided).
- Consider whether the candidate's experience is RELEVANT to this specific position
- A detailed, specific answer with concrete examples should score higher
- Experience that directly relates to the required skills should score higher

Respond with a JSON object:
{
  "score": <number 0-1>,
  "reasoning": "<brief explanation of score, including relevance to role>",
  "needsFollowup": <true if answer is vague/incomplete or matches a follow-up trigger>,
  "followupReason": "<which trigger matched, if any>"
}

JSON response only:`;
}

/**
 * Call LLM evaluator (Task 10.2)
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

