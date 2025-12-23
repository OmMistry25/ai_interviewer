-- Create interview_templates table
CREATE TABLE interview_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  active_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create interview_template_versions table
CREATE TABLE interview_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES interview_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (template_id, version)
);

-- Add FK from templates to versions (for active_version_id)
ALTER TABLE interview_templates
  ADD CONSTRAINT fk_active_version
  FOREIGN KEY (active_version_id)
  REFERENCES interview_template_versions(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS: Templates scoped to org members
CREATE POLICY "Org members can view templates"
  ON interview_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interview_templates.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert templates"
  ON interview_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interview_templates.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update templates"
  ON interview_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = interview_templates.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Template versions scoped via template's org
CREATE POLICY "Org members can view template versions"
  ON interview_template_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_templates
      JOIN organization_members ON organization_members.org_id = interview_templates.org_id
      WHERE interview_templates.id = interview_template_versions.template_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert template versions"
  ON interview_template_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_templates
      JOIN organization_members ON organization_members.org_id = interview_templates.org_id
      WHERE interview_templates.id = interview_template_versions.template_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update draft versions"
  ON interview_template_versions FOR UPDATE
  TO authenticated
  USING (
    published_at IS NULL
    AND EXISTS (
      SELECT 1 FROM interview_templates
      JOIN organization_members ON organization_members.org_id = interview_templates.org_id
      WHERE interview_templates.id = interview_template_versions.template_id
      AND organization_members.user_id = auth.uid()
    )
  );

