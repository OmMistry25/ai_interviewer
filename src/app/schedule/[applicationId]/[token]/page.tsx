import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ScheduleForm } from "./ScheduleForm";
import { CheckCircle, Clock, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Already Scheduled!</h1>
          <p className="text-slate-400 mb-4">
            Your interview is scheduled for:
          </p>
          <p className="text-lg text-amber-400 font-medium">
            {new Date(application.scheduled_at).toLocaleString()}
          </p>
          <p className="text-slate-500 text-sm mt-4">
            Check your email for the interview link.
          </p>
        </div>
      </div>
    );
  }

  // Check if already interviewed
  if (application.status === "interviewed") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Interview Complete</h1>
          <p className="text-slate-400">
            Thank you for completing your interview! We&apos;ll be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p className="text-amber-500 text-sm font-medium mb-1">{orgName}</p>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Schedule Your Interview</h1>
          <p className="text-slate-400">
            for the <span className="text-slate-100">{job.title}</span> position
          </p>
        </div>

        <Card className="mb-6">
          <p className="text-slate-300 mb-4">
            Hi <span className="font-medium text-slate-100">{candidate.first_name}</span>! 
            Select a time that works best for you to complete your AI-powered video interview.
          </p>
          <div className="flex items-start gap-3 text-sm text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>The interview takes about 10-15 minutes. Choose a time when you can be in a quiet space with good lighting.</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Clock className="w-4 h-4" />
            <span>Select your preferred time</span>
          </div>
          <ScheduleForm 
            applicationId={applicationId} 
            token={token}
            jobId={job.id}
            templateId={job.template_id}
          />
        </Card>

        {/* Take Interview Now Option */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm mb-3">Or if you&apos;re ready now...</p>
          <ScheduleForm 
            applicationId={applicationId} 
            token={token}
            jobId={job.id}
            templateId={job.template_id}
            immediateMode={true}
          />
        </div>
      </div>
    </div>
  );
}
