import { z } from "zod";

export const candidateSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});

export type Candidate = z.infer<typeof candidateSchema> & {
  created_at: string;
};

export const applicationSchema = z.object({
  id: z.string().uuid().optional(),
  job_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  resume_path: z.string().optional(),
  resume_original_name: z.string().optional(),
  resume_analysis: z.any().optional(),
  status: z.enum(["applied", "scheduled", "interviewed", "accepted", "rejected"]).default("applied"),
  scheduled_at: z.string().datetime().optional(),
  schedule_token: z.string().optional(),
});

export type Application = z.infer<typeof applicationSchema> & {
  created_at: string;
  updated_at: string;
};

// Extended application with joined data
export interface ApplicationWithDetails extends Application {
  candidate: Candidate;
  job?: {
    id: string;
    title: string;
    org_id: string;
  };
  interview?: {
    id: string;
    status: string;
    access_token: string;
  };
}

export const applyFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
});

export type ApplyFormInput = z.infer<typeof applyFormSchema>;

