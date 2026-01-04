-- Add dynamic_state column for storing dynamic interview progress
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS dynamic_state JSONB DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interviews_dynamic_state 
ON interviews USING GIN (dynamic_state) 
WHERE dynamic_state IS NOT NULL;

