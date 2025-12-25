import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  const { data: templates } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      template_versions (
        id,
        version,
        status,
        created_at
      )
    `)
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Interview Templates</h1>
          <Link
            href="/admin/templates/new"
            className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
          >
            + Create Template
          </Link>
        </div>

        <div className="grid gap-4">
          {templates?.map((template) => {
            const versions = template.template_versions as Array<{
              id: string;
              version: number;
              status: string;
              created_at: string;
            }>;
            const publishedVersion = versions?.find((v) => v.status === "published");
            const latestVersion = versions?.[0];

            return (
              <div
                key={template.id}
                className="bg-zinc-800 rounded-lg p-6 border border-zinc-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{template.name}</h2>
                    <p className="text-zinc-400 text-sm mt-1">
                      {versions?.length || 0} version(s)
                      {publishedVersion && (
                        <span className="ml-2 text-emerald-400">
                          • v{publishedVersion.version} published
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/templates/${template.id}/edit`}
                    className="px-4 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}

          {(!templates || templates.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <p>No templates yet. Create your first one!</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
