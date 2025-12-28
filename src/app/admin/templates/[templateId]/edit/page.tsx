import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect, notFound } from "next/navigation";
import { TemplateEditor } from "./TemplateEditor";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

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

  const { data: template, error } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      org_id,
      interview_template_versions!interview_template_versions_template_id_fkey (
        id,
        version,
        config,
        published_at,
        created_at
      )
    `)
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("[EditTemplatePage] Query error:", error);
  }

  if (!template) {
    notFound();
  }

  // Verify org ownership
  if (template.org_id !== org.orgId) {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/templates" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">
                  Version {latestVersion?.version || 1}
                </span>
                <Badge variant={isPublished ? "success" : "warning"}>
                  {isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <TemplateEditor
          versionId={latestVersion?.id || ""}
          initialConfig={latestVersion?.config || {}}
          status={isPublished ? "published" : "draft"}
        />
      </div>
    </div>
  );
}
