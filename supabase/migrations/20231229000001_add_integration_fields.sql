-- Add fields for Zapier/external integrations
-- These allow us to track where interviews came from and callback when complete

-- Webhook URL for notifying external systems when interview completes
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Phone number for SMS-based interview invites
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_phone TEXT;

-- Source of interview creation (web, admin, zapier, etc.)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- Index for finding interviews by source (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_interviews_source ON interviews(source);

