import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { TemplateEditor } from "./TemplateEditor";

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  // Use admin client to bypass RLS for reading templates
  const supabase = createSupabaseAdminClient();

  console.log("[EditTemplatePage] Looking for template:", templateId, "org:", org.orgId);

  const { data: template, error } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      org_id,
      interview_template_versions (
        id,
        version,
        config,
        published_at,
        created_at
      )
    `)
    .eq("id", templateId)
    .single();

  console.log("[EditTemplatePage] Query result:", { template, error });

  if (!template) {
    console.log("[EditTemplatePage] Template not found, returning 404");
    notFound();
  }

  // Verify org ownership
  if (template.org_id !== org.orgId) {
    console.log("[EditTemplatePage] Org mismatch:", template.org_id, "vs", org.orgId);
    notFound();
  }

  const versions = template.interview_template_versions as Array<{
    id: string;
    version: number;
    config: Record<string, unknown>;
    published_at: string | null;
    created_at: string;
  }>;

  // Get the latest version (draft or published)
  const latestVersion = versions?.sort((a, b) => b.version - a.version)[0];
  const isPublished = latestVersion?.published_at !== null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
        <p className="text-zinc-400 mb-8">
          Version {latestVersion?.version || 1} ({isPublished ? "published" : "draft"})
        </p>

        <TemplateEditor
          versionId={latestVersion?.id || ""}
          initialConfig={latestVersion?.config || {}}
          status={isPublished ? "published" : "draft"}
        />
      </div>
    </div>
  );
}
