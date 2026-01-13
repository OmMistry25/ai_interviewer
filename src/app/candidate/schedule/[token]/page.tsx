import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { ScheduleGrid } from "./ScheduleGrid";
import { Card } from "@/components/ui/Card";
import { Calendar, Clock, CheckCircle } from "lucide-react";

type Params = Promise<{ token: string }>;

export const metadata = {
  title: "Submit Your Schedule - Cliq",
  description: "Let us know when you're available to work.",
};

export default async function SchedulePage({ params }: { params: Params }) {
  const { token } = await params;
  const adminClient = createSupabaseAdminClient();

  // Find interview by access token
  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .select("id, application_id, status")
    .eq("access_token", token)
    .single();

  if (interviewError || !interview) {
    notFound();
  }

  // Interview must be completed
  if (interview.status !== "completed") {
    redirect(`/candidate/interview/${token}`);
  }

  if (!interview.application_id) {
    notFound();
  }

  // Get application details
  const { data: application, error: appError } = await adminClient
    .from("applications")
    .select(`
      id,
      schedule_availability,
      schedule_submitted_at,
      candidates (first_name, last_name),
      job_postings (title, organizations (name))
    `)
    .eq("id", interview.application_id)
    .single();

  if (appError || !application) {
    notFound();
  }

  // If already submitted, show success
  if (application.schedule_submitted_at) {
    const candidate = application.candidates as unknown as { first_name: string; last_name: string };
    const jobPosting = application.job_postings as unknown as { title: string; organizations: { name: string } };
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Application Submitted!</h1>
          <p className="text-slate-400 mb-8">
            Thanks, {candidate?.first_name}! Your application for{" "}
            <span className="text-slate-300">{jobPosting?.title}</span> at{" "}
            <span className="text-slate-300">{jobPosting?.organizations?.name}</span> is complete.
          </p>
          <Card>
            <p className="text-slate-300 text-sm">
              We&apos;ll review your interview and availability, and be in touch soon.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const candidate = application.candidates as unknown as { first_name: string; last_name: string };
  const jobPosting = application.job_postings as unknown as { title: string; organizations: { name: string } };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <p className="text-sm text-emerald-500 font-medium mb-1">Almost Done!</p>
          <h1 className="text-2xl font-bold text-slate-100">Submit Your Availability</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Info Section */}
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">{candidate?.first_name} {candidate?.last_name}</p>
                  <p className="text-sm text-slate-500">{jobPosting?.title}</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Select the days and shifts when you&apos;re available to work. 
                This helps us match you with cafes that need coverage during those times.
              </p>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Shift Times
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex justify-between">
                  <span>Morning</span>
                  <span className="text-slate-500">6am - 10am</span>
                </li>
                <li className="flex justify-between">
                  <span>Afternoon</span>
                  <span className="text-slate-500">10am - 2pm</span>
                </li>
                <li className="flex justify-between">
                  <span>Evening</span>
                  <span className="text-slate-500">2pm - 6pm</span>
                </li>
                <li className="flex justify-between">
                  <span>Night</span>
                  <span className="text-slate-500">6pm - 10pm</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Schedule Grid */}
          <div className="md:col-span-2">
            <Card>
              <h2 className="text-lg font-semibold text-slate-100 mb-6">
                When can you work?
              </h2>
              <ScheduleGrid 
                applicationId={application.id} 
                interviewToken={token}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


