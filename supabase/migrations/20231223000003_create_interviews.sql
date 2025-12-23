-- Create interviews table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES interview_template_versions(id),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
  current_question_id TEXT,
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create interview_turns table
CREATE TABLE interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('ai', 'candidate')),
  transcript TEXT NOT NULL,
  question_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create evaluations table
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID UNIQUE NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}',
  decision TEXT CHECK (decision IN ('advance', 'hold', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can view their org's interviews
CREATE POLICY "Org members can view interviews"
  ON interviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interviews.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Candidates can view their own interview via access token (handled in app)
-- For now, just org member access

CREATE POLICY "Org members can insert interviews"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interviews.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update interviews"
  ON interviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interviews.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Interview turns scoped via interview's org
CREATE POLICY "Org members can view interview turns"
  ON interview_turns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN organization_members ON organization_members.org_id = interviews.org_id
      WHERE interviews.id = interview_turns.interview_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert interview turns"
  ON interview_turns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN organization_members ON organization_members.org_id = interviews.org_id
      WHERE interviews.id = interview_turns.interview_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Evaluations scoped via interview's org
CREATE POLICY "Org members can view evaluations"
  ON evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN organization_members ON organization_members.org_id = interviews.org_id
      WHERE interviews.id = evaluations.interview_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      JOIN organization_members ON organization_members.org_id = interviews.org_id
      WHERE interviews.id = evaluations.interview_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Index for token lookup
CREATE INDEX idx_interviews_access_token ON interviews(access_token);

