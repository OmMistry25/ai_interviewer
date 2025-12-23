import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TemplateEditor } from "./TemplateEditor";

type Params = Promise<{ templateId: string }>;

export default async function EditTemplatePage({ params }: { params: Params }) {
  const { templateId } = await params;
  
  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  // Get template
  const { data: template } = await supabase
    .from("interview_templates")
    .select("id, name, status, org_id")
    .eq("id", templateId)
    .eq("org_id", org.orgId)
    .single();

  if (!template) {
    redirect("/admin/templates");
  }

  // Get latest version
  const { data: version } = await supabase
    .from("interview_template_versions")
    .select("id, version, config, published_at")
    .eq("template_id", templateId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{template.name}</h1>
            <p className="text-zinc-500 text-sm">
              Version {version?.version ?? 1} •{" "}
              {version?.published_at ? (
                <span className="text-green-400">Published</span>
              ) : (
                <span className="text-yellow-400">Draft</span>
              )}
            </p>
          </div>
          <Link
            href="/admin/templates"
            className="text-zinc-400 hover:text-white"
          >
            ← Back to templates
          </Link>
        </div>

        {version && (
          <TemplateEditor
            versionId={version.id}
            config={version.config}
            isPublished={!!version.published_at}
          />
        )}
      </div>
    </div>
  );
}

