import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ApplyForm } from "./ApplyForm";

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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm text-emerald-400 font-medium">{orgName}</p>
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Job Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-lg font-semibold text-white mb-4">Position Details</h2>
              
              {job.location && (
                <div className="flex items-center gap-2 text-zinc-300 mb-3">
                  <span>📍</span>
                  <span>{job.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-zinc-300 mb-3">
                <span>⏰</span>
                <span>
                  {job.employment_type === "full_time" ? "Full-time" :
                   job.employment_type === "part_time" ? "Part-time" : "Contract"}
                </span>
              </div>
              
              {job.hourly_rate_min && job.hourly_rate_max && (
                <div className="flex items-center gap-2 text-zinc-300 mb-3">
                  <span>💰</span>
                  <span>${job.hourly_rate_min} - ${job.hourly_rate_max}/hr</span>
                </div>
              )}
            </div>

            {job.description && (
              <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                <h2 className="text-lg font-semibold text-white mb-4">About the Role</h2>
                <p className="text-zinc-400 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                <h2 className="text-lg font-semibold text-white mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {job.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-zinc-400">
                      <span className="text-emerald-400">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Application Form */}
          <div className="md:col-span-3">
            <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-xl font-semibold text-white mb-6">Apply Now</h2>
              <ApplyForm jobId={jobId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

