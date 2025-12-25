import { z } from "zod";

export const jobPostingSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.enum(["full_time", "part_time", "contract"]).default("full_time"),
  hourly_rate_min: z.number().positive().optional(),
  hourly_rate_max: z.number().positive().optional(),
  requirements: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "paused", "closed"]).default("draft"),
  template_id: z.string().uuid().optional(),
});

export type JobPosting = z.infer<typeof jobPostingSchema> & {
  created_at: string;
  updated_at: string;
};

export const createJobSchema = jobPostingSchema.omit({ id: true, org_id: true });
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = jobPostingSchema.partial().omit({ org_id: true });
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

