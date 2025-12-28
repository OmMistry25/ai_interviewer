import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ApplyForm } from "./ApplyForm";
import { MapPin, Clock, DollarSign, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Params = Promise<{ jobId: string }>;

export default async function ApplyPage({ params }: { params: Params }) {
  const { jobId } = await params;
  const admin = createSupabaseAdminClient();

  // Get job details
  const { data: job, error } = await admin
    .from("job_postings")
    .select("id, title, description, location, employment_type, hourly_rate_min, hourly_rate_max, requirements, org_id, organizations(name)")
    .eq("id", jobId)
    .eq("status", "active")
    .single();

  if (error || !job) {
    notFound();
  }

  const orgName = (job.organizations as any)?.name || "Company";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <p className="text-sm text-amber-500 font-medium mb-1">{orgName}</p>
          <h1 className="text-2xl font-bold text-slate-100">{job.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Job Details */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-100 mb-5">Position Details</h2>
              
              <div className="space-y-4">
                {job.location && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <span>{job.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>
                    {job.employment_type === "full_time" ? "Full-time" :
                     job.employment_type === "part_time" ? "Part-time" : "Contract"}
                  </span>
                </div>
                
                {job.hourly_rate_min && job.hourly_rate_max && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                    </div>
                    <span>${job.hourly_rate_min} - ${job.hourly_rate_max}/hr</span>
                  </div>
                )}
              </div>
            </Card>

            {job.description && (
              <Card>
                <h2 className="text-lg font-semibold text-slate-100 mb-4">About the Role</h2>
                <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </Card>
            )}

            {job.requirements && job.requirements.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Requirements</h2>
                <ul className="space-y-3">
                  {job.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-slate-400">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Application Form */}
          <div className="md:col-span-3">
            <Card>
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Apply Now</h2>
              <ApplyForm jobId={jobId} />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
