-- Job postings table for cafe owner job listings
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'full_time', -- full_time, part_time, contract
  hourly_rate_min DECIMAL(10,2),
  hourly_rate_max DECIMAL(10,2),
  requirements TEXT[], -- Array of requirements
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, closed
  template_id UUID REFERENCES interview_templates(id), -- Which interview template to use
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for org lookups
CREATE INDEX idx_job_postings_org_id ON job_postings(org_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);

-- RLS policies
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's job postings
CREATE POLICY "Org members can view job postings"
  ON job_postings FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Org members can insert job postings for their org
CREATE POLICY "Org members can create job postings"
  ON job_postings FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Org members can update their org's job postings
CREATE POLICY "Org members can update job postings"
  ON job_postings FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Org members can delete their org's job postings
CREATE POLICY "Org members can delete job postings"
  ON job_postings FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Public can view active job postings (for apply page)
CREATE POLICY "Public can view active job postings"
  ON job_postings FOR SELECT
  USING (status = 'active');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_postings_updated_at();

