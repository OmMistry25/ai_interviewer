-- Add schedule_availability column to applications table
-- Stores candidate's availability as JSON: { "monday": ["morning", "afternoon"], ... }

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS schedule_availability JSONB,
  ADD COLUMN IF NOT EXISTS schedule_submitted_at TIMESTAMPTZ;

-- Index for querying applications that haven't submitted schedules
CREATE INDEX IF NOT EXISTS idx_applications_schedule_submitted 
  ON applications(schedule_submitted_at) 
  WHERE schedule_submitted_at IS NULL;

COMMENT ON COLUMN applications.schedule_availability IS 'Candidate availability: { day: [shifts] } where shifts are morning/afternoon/evening/night';
COMMENT ON COLUMN applications.schedule_submitted_at IS 'Timestamp when candidate submitted their schedule availability';

