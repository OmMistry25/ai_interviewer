import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { createTemplate } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const { data: templates } = await supabase
    .from("interview_templates")
    .select("id, name, status, created_at")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Interview Templates</h1>
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        {/* Create Template Form */}
        <form action={createTemplate} className="mb-8 flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="New template name"
            required
            className="flex-1 p-3 rounded bg-zinc-800 text-white border border-zinc-700"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Create Template
          </button>
        </form>

        {/* Template List */}
        {templates && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 bg-zinc-800 rounded"
              >
                <div>
                  <p className="text-white font-medium">{template.name}</p>
                  <p className="text-zinc-500 text-sm">
                    Status:{" "}
                    <span
                      className={
                        template.status === "published"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {template.status}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/admin/templates/${template.id}/edit`}
                  className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No templates yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}

