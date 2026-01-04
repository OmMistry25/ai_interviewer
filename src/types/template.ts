import { z } from "zod";

// Rubric for scoring a question
const rubricSchema = z.object({
  signal: z.string().min(1),
  weight: z.number().min(0).max(1),
});

// Follow-up question triggered by condition
const followupSchema = z.object({
  condition: z.string().min(1),
  prompt: z.string().min(1),
});

// Interview question (used for static mode and screening/exit questions)
const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  followups: z.array(followupSchema).optional().default([]),
  rubric: rubricSchema.optional(),
});

// Screening question for dynamic mode (simpler structure)
const screeningQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
});

// Exit question for graceful ending
const exitQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
});

// Voice settings for TTS
const voiceSchema = z.object({
  voice_id: z.string().min(1),
  speed: z.number().min(0.5).max(2).optional().default(1.0),
});

// Interview policies
const policiesSchema = z.object({
  max_followups_per_question: z.number().int().min(0).max(5).optional().default(1),
  min_answer_seconds: z.number().min(0).optional().default(6),
  max_exit_questions: z.number().int().min(1).max(3).optional().default(2),
});

// Role context for evaluation (extended for dynamic mode)
const roleContextSchema = z.object({
  job_title: z.string().min(1),
  department: z.string().optional(),
  level: z.string().optional(), // e.g., "junior", "mid", "senior", "lead"
  required_skills: z.array(z.string()).optional().default([]),
  preferred_experience: z.string().optional(), // e.g., "3+ years in SaaS sales"
  company_context: z.string().optional(), // e.g., "Fast-paced AI startup"
  evaluation_notes: z.string().optional(), // Any specific guidance for evaluators
  // New fields for dynamic mode
  key_skills: z.array(z.string()).optional(), // Skills to evaluate
  ideal_candidate: z.string().optional(), // Description of ideal candidate
  interview_duration: z.string().optional(), // e.g., "8-10 minutes"
  total_questions: z.number().int().min(3).max(10).optional().default(5), // Target number of questions
});

// Full template config - supports both static and dynamic modes
export const templateConfigSchema = z.object({
  system_prompt: z.string().min(1),
  role_context: roleContextSchema.optional(),
  voice: voiceSchema.optional().default({ voice_id: "neutral", speed: 1.0 }),
  
  // Static mode: fixed questions array (backward compatible)
  questions: z.array(questionSchema).optional(),
  
  // Dynamic mode fields
  dynamic_mode: z.boolean().optional().default(false),
  fit_criteria: z.string().optional(), // What makes a candidate a fit
  screening_questions: z.array(screeningQuestionSchema).optional(), // 2-4 key screening questions
  exit_questions: z.array(exitQuestionSchema).optional(), // 1-2 graceful exit questions
  
  policies: policiesSchema.optional().default({
    max_followups_per_question: 1,
    min_answer_seconds: 6,
    max_exit_questions: 2,
  }),
}).refine(
  (data) => {
    // Validation: Either questions (static) or screening_questions (dynamic) must be present
    if (data.dynamic_mode) {
      return data.screening_questions && data.screening_questions.length >= 1;
    }
    return data.questions && data.questions.length >= 1;
  },
  {
    message: "Static mode requires 'questions' array. Dynamic mode requires 'screening_questions' array.",
  }
);

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type RoleContext = z.infer<typeof roleContextSchema>;
export type Question = z.infer<typeof questionSchema>;
export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;
export type ExitQuestion = z.infer<typeof exitQuestionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type Followup = z.infer<typeof followupSchema>;

// Helper to determine interview mode
export function getInterviewMode(config: TemplateConfig): "static" | "dynamic" {
  if (config.dynamic_mode === true && config.screening_questions && config.screening_questions.length > 0) {
    return "dynamic";
  }
  return "static";
}

