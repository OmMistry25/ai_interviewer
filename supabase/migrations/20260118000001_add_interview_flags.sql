-- Interview Flags: Store red/green flag observations for each Q&A turn
-- This is ADDITIVE ONLY - does not modify existing tables or data

-- New table for storing interview flags/observations
CREATE TABLE interview_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('red', 'green')),
  category TEXT NOT NULL, -- e.g., 'enthusiasm', 'experience', 'communication', 'concern'
  description TEXT NOT NULL,
  quote TEXT, -- Key quote from candidate that triggered the flag
  clip_path TEXT, -- Path to audio clip in storage (null until uploaded)
  clip_duration_ms INTEGER, -- Duration of the audio clip
  question_text TEXT, -- The question that was asked
  answer_text TEXT, -- The candidate's answer
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookup by interview
CREATE INDEX idx_interview_flags_interview ON interview_flags(interview_id);

-- Index for finding flags pending clip upload
CREATE INDEX idx_interview_flags_pending_clips ON interview_flags(interview_id) 
  WHERE clip_path IS NULL;

-- Enable RLS
ALTER TABLE interview_flags ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can view flags for their org's interviews
CREATE POLICY "Org members can view interview flags"
  ON interview_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN organization_members om ON om.org_id = i.org_id
      WHERE i.id = interview_flags.interview_id
      AND om.user_id = auth.uid()
    )
  );

-- RLS: System can insert flags (via service role)
CREATE POLICY "Service role can insert flags"
  ON interview_flags FOR INSERT
  WITH CHECK (true);

-- RLS: System can update flags (for adding clip_path)
CREATE POLICY "Service role can update flags"
  ON interview_flags FOR UPDATE
  USING (true);

-- Add flags_summary column to interviews table for quick overview
-- This stores aggregated flag counts: { red: 2, green: 5 }
ALTER TABLE interviews 
  ADD COLUMN IF NOT EXISTS flags_summary JSONB DEFAULT NULL;

-- Comment for documentation
COMMENT ON TABLE interview_flags IS 'Stores red/green flag observations for notable Q&A moments during interviews';
COMMENT ON COLUMN interview_flags.flag_type IS 'red = concern/issue, green = positive signal';
COMMENT ON COLUMN interview_flags.category IS 'Category of observation: enthusiasm, experience, communication, concern, etc.';
COMMENT ON COLUMN interview_flags.clip_path IS 'Path to audio clip in Supabase Storage, null until uploaded';


