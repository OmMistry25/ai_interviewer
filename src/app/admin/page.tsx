import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { signOut } from "../(auth)/actions";
import { createOrganization } from "../(auth)/org-actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Briefcase, Users, FileText, Video, LogOut, Building2 } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  const org = await getCurrentOrg();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/">
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Cliq</h1>
          </Link>
          <p className="text-slate-500">Admin Dashboard</p>
        </div>
        
        <div className="space-y-6">
          <p className="text-center text-slate-400">
            Logged in as <span className="text-slate-300">{session.user.email}</span>
          </p>
          
          {org ? (
            <>
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">{org.name}</p>
                    <p className="text-sm text-slate-500 capitalize">{org.role}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/admin/jobs">
                    <Card hover padding="sm" className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200">Jobs</span>
                    </Card>
                  </Link>
                  
                  <Link href="/admin/candidates">
                    <Card hover padding="sm" className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200">Candidates</span>
                    </Card>
                  </Link>
                  
                  <Link href="/admin/templates">
                    <Card hover padding="sm" className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200">Templates</span>
                    </Card>
                  </Link>
                  
                  <Link href="/admin/interviews">
                    <Card hover padding="sm" className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-200">Interviews</span>
                    </Card>
                  </Link>
                </div>
              </Card>
              
              <form action={signOut} className="text-center">
                <Button type="submit" variant="ghost" icon={<LogOut className="w-4 h-4" />}>
                  Sign Out
                </Button>
              </form>
            </>
          ) : (
            <Card>
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Create Your Organization</h2>
              <form action={createOrganization} className="space-y-4">
                <Input
                  name="name"
                  type="text"
                  label="Organization Name"
                  placeholder="Acme Inc."
                  required
                />
                <Button type="submit" variant="primary" className="w-full">
                  Create Organization
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

