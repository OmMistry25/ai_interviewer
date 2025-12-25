-- Candidates table for applicant profiles
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique email per candidate
CREATE UNIQUE INDEX idx_candidates_email ON candidates(email);

-- Applications table links candidates to job postings
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Resume storage
  resume_path TEXT, -- Path in Supabase Storage
  resume_original_name TEXT,
  
  -- AI Resume Analysis (populated after parsing)
  resume_analysis JSONB,
  
  -- Application status
  status TEXT NOT NULL DEFAULT 'applied', 
  -- applied, scheduled, interviewed, accepted, rejected
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  schedule_token TEXT UNIQUE, -- Token for scheduling link
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_schedule_token ON applications(schedule_token);

-- Unique constraint: one application per candidate per job
CREATE UNIQUE INDEX idx_applications_job_candidate ON applications(job_id, candidate_id);

-- RLS policies
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Anyone can create a candidate (public apply)
CREATE POLICY "Anyone can create candidates"
  ON candidates FOR INSERT
  WITH CHECK (true);

-- Org members can view candidates who applied to their jobs
CREATE POLICY "Org members can view candidates"
  ON candidates FOR SELECT
  USING (
    id IN (
      SELECT candidate_id FROM applications
      WHERE job_id IN (
        SELECT id FROM job_postings
        WHERE org_id IN (
          SELECT org_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Anyone can create applications (public apply)
CREATE POLICY "Anyone can create applications"
  ON applications FOR INSERT
  WITH CHECK (true);

-- Org members can view applications for their jobs
CREATE POLICY "Org members can view applications"
  ON applications FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Org members can update applications for their jobs
CREATE POLICY "Org members can update applications"
  ON applications FOR UPDATE
  USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Public can view their own application via schedule token
CREATE POLICY "Candidates can view own application via token"
  ON applications FOR SELECT
  USING (schedule_token IS NOT NULL);

-- Updated at trigger for applications
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

