-- Add onsite_availability field to store candidate's preferred on-site interview times
-- Format: Line-separated date/time slots (e.g., "Jan 15, 2026 at 2:00 PM\nJan 17, 2026 at 10:00 AM")

ALTER TABLE "public"."interviews" 
ADD COLUMN IF NOT EXISTS "onsite_availability" text;

-- Add index for filtering interviews with/without availability submitted
CREATE INDEX IF NOT EXISTS idx_interviews_onsite_availability 
ON "public"."interviews" (onsite_availability) 
WHERE onsite_availability IS NOT NULL;

