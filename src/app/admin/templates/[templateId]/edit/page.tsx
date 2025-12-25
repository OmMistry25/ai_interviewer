import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { TemplateEditor } from "./TemplateEditor";

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      template_versions (
        id,
        version,
        config,
        status,
        created_at
      )
    `)
    .eq("id", templateId)
    .eq("org_id", org.orgId)
    .single();

  if (!template) {
    notFound();
  }

  const versions = template.template_versions as Array<{
    id: string;
    version: number;
    config: Record<string, unknown>;
    status: string;
    created_at: string;
  }>;

  // Get the latest version (draft or published)
  const latestVersion = versions?.sort((a, b) => b.version - a.version)[0];

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
        <p className="text-zinc-400 mb-8">
          Version {latestVersion?.version || 1} ({latestVersion?.status || "draft"})
        </p>

        <TemplateEditor
          versionId={latestVersion?.id || ""}
          initialConfig={latestVersion?.config || {}}
          status={latestVersion?.status || "draft"}
        />
      </div>
    </div>
  );
}
