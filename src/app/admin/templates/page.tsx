import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileText, Plus, ArrowLeft, ChevronRight, Layers } from "lucide-react";

export default async function TemplatesPage() {
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  // Use admin client to bypass RLS
  const supabase = createSupabaseAdminClient();

  const { data: templates } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      interview_template_versions!interview_template_versions_template_id_fkey (
        id,
        version,
        published_at,
        created_at
      )
    `)
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Interview Templates</h1>
          </div>
          <Link href="/admin/templates/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Create Template
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {templates?.map((template) => {
            const versions = template.interview_template_versions as Array<{
              id: string;
              version: number;
              published_at: string | null;
              created_at: string;
            }>;
            const publishedVersion = versions?.find((v) => v.published_at !== null);

            return (
              <Card key={template.id} hover>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 text-slate-400 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">{template.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-500">
                          {versions?.length || 0} version(s)
                        </span>
                        {publishedVersion ? (
                          <Badge variant="success">v{publishedVersion.version} published</Badge>
                        ) : (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/admin/templates/${template.id}/edit`}
                    className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                  >
                    Edit <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            );
          })}

          {(!templates || templates.length === 0) && (
            <Card>
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No templates yet</p>
                <p className="text-sm mt-1">Create your first interview template</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
