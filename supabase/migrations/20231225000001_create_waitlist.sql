-- Waitlist candidates table for baristas in locations without active jobs
CREATE TABLE waitlist_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_location TEXT NOT NULL,
  resume_path TEXT,
  resume_original_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, contacted, converted, inactive
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique email per waitlist candidate
CREATE UNIQUE INDEX idx_waitlist_email ON waitlist_candidates(email);

-- Index for location-based queries
CREATE INDEX idx_waitlist_location ON waitlist_candidates(preferred_location);
CREATE INDEX idx_waitlist_status ON waitlist_candidates(status);

-- RLS policies
ALTER TABLE waitlist_candidates ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist (public)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist_candidates FOR INSERT
  WITH CHECK (true);

-- Admin users can view waitlist candidates
CREATE POLICY "Admin users can view waitlist"
  ON waitlist_candidates FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
    )
  );

-- Admin users can update waitlist candidates
CREATE POLICY "Admin users can update waitlist"
  ON waitlist_candidates FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_waitlist_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_candidates_updated_at
  BEFORE UPDATE ON waitlist_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_candidates_updated_at();


