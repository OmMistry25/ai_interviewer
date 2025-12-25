import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import { JobForm } from "../JobForm";

export default async function NewJobPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) {
    redirect("/");
  }

  // Get templates for dropdown
  const { data: templates } = await supabase
    .from("interview_templates")
    .select("id, name")
    .eq("org_id", org.orgId)
    .eq("status", "published");

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Job</h1>
        <JobForm templates={templates || []} />
      </div>
    </div>
  );
}

