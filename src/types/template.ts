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

// Full template config
export const templateConfigSchema = z.object({
  system_prompt: z.string().min(1),
  voice: voiceSchema.optional().default({ voice_id: "neutral", speed: 1.0 }),
  questions: z.array(questionSchema).min(1),
  policies: policiesSchema.optional().default({
    max_followups_per_question: 1,
    min_answer_seconds: 6,
  }),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type Followup = z.infer<typeof followupSchema>;

