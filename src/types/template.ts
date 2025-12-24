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

// Interview question
const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  followups: z.array(followupSchema).optional().default([]),
  rubric: rubricSchema.optional(),
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
});

// Role context for evaluation
const roleContextSchema = z.object({
  job_title: z.string().min(1),
  department: z.string().optional(),
  level: z.string().optional(), // e.g., "junior", "mid", "senior", "lead"
  required_skills: z.array(z.string()).optional().default([]),
  preferred_experience: z.string().optional(), // e.g., "3+ years in SaaS sales"
  company_context: z.string().optional(), // e.g., "Fast-paced AI startup"
  evaluation_notes: z.string().optional(), // Any specific guidance for evaluators
});

// Full template config
export const templateConfigSchema = z.object({
  system_prompt: z.string().min(1),
  role_context: roleContextSchema.optional(),
  voice: voiceSchema.optional().default({ voice_id: "neutral", speed: 1.0 }),
  questions: z.array(questionSchema).min(1),
  policies: policiesSchema.optional().default({
    max_followups_per_question: 1,
    min_answer_seconds: 6,
  }),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type RoleContext = z.infer<typeof roleContextSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type Followup = z.infer<typeof followupSchema>;

