import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import { JobForm } from "../JobForm";

export default async function NewJobPage() {
  const supabase = await createSupabaseServerClient();
  const org = await getCurrentOrg();
  
  if (!org) {
    redirect("/login");
  }

  // Get published templates
  const { data: templates } = await supabase
    .from("interview_templates")
    .select(`
      id,
      name,
      interview_template_versions!interview_template_versions_template_id_fkey (
        published_at
      )
    `)
    .eq("org_id", org.orgId)
    .not("interview_template_versions.published_at", "is", null);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Job</h1>
        <JobForm
          templates={templates?.map((t) => ({ id: t.id, name: t.name })) || []}
        />
      </div>
    </div>
  );
}
