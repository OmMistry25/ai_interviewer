import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ScheduleForm } from "./ScheduleForm";

type Params = Promise<{ applicationId: string; token: string }>;

export default async function SchedulePage({ params }: { params: Params }) {
  const { applicationId, token } = await params;
  const admin = createSupabaseAdminClient();

  // Validate token and get application
  const { data: application, error } = await admin
    .from("applications")
    .select(`
      id,
      status,
      scheduled_at,
      schedule_token,
      candidate:candidates(first_name, last_name, email),
      job:job_postings(id, title, template_id, org_id, organizations(name))
    `)
    .eq("id", applicationId)
    .eq("schedule_token", token)
    .single();

  if (error || !application) {
    notFound();
  }

  const candidate = application.candidate as any;
  const job = application.job as any;
  const orgName = job?.organizations?.name || "Company";

  // Check if already scheduled
  if (application.status === "scheduled" && application.scheduled_at) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Already Scheduled!</h1>
          <p className="text-zinc-400 mb-4">
            Your interview is scheduled for:
          </p>
          <p className="text-lg text-emerald-400 font-medium">
            {new Date(application.scheduled_at).toLocaleString()}
          </p>
          <p className="text-zinc-500 text-sm mt-4">
            Check your email for the interview link.
          </p>
        </div>
      </div>
    );
  }

  // Check if already interviewed
  if (application.status === "interviewed") {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Interview Complete</h1>
          <p className="text-zinc-400">
            Thank you for completing your interview! We&apos;ll be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p className="text-emerald-400 text-sm font-medium mb-1">{orgName}</p>
          <h1 className="text-3xl font-bold text-white mb-2">Schedule Your Interview</h1>
          <p className="text-zinc-400">
            for the <span className="text-white">{job.title}</span> position
          </p>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700 mb-6">
          <p className="text-zinc-300 mb-4">
            Hi <span className="font-medium text-white">{candidate.first_name}</span>! 
            Select a time that works best for you to complete your AI-powered video interview.
          </p>
          <div className="flex items-start gap-3 text-sm text-zinc-400">
            <span className="text-emerald-400">💡</span>
            <span>The interview takes about 10-15 minutes. Choose a time when you can be in a quiet space with good lighting.</span>
          </div>
        </div>

        <ScheduleForm 
          applicationId={applicationId} 
          token={token}
          jobId={job.id}
          templateId={job.template_id}
        />
      </div>
    </div>
  );
}

