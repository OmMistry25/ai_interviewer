-- Add missing columns to interviews table for storing results
ALTER TABLE interviews 
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- Create index for application lookup
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);

