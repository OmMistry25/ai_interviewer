import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import { JobForm } from "../JobForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/jobs" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Create New Job</h1>
          </div>
        </div>

        <Card>
          <JobForm
            templates={templates?.map((t) => ({ id: t.id, name: t.name })) || []}
          />
        </Card>
      </div>
    </div>
  );
}
