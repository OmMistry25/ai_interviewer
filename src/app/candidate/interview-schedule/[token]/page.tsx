import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { OnsiteSchedulePicker } from "./OnsiteSchedulePicker";
import { Calendar, CheckCircle } from "lucide-react";

type Params = Promise<{ token: string }>;

export const metadata = {
  title: "Schedule Your On-Site Interview",
  description: "Select when you're available for an on-site interview.",
};

export default async function InterviewSchedulePage({ params }: { params: Params }) {
  const { token } = await params;
  const adminClient = createSupabaseAdminClient();

  // Find interview by access token
  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .select("id, status, candidate_name, onsite_availability")
    .eq("access_token", token)
    .single();

  if (interviewError || !interview) {
    notFound();
  }

  // Interview must be completed
  if (interview.status !== "completed") {
    redirect(`/candidate/interview/${token}`);
  }

  // If already submitted availability, show confirmation
  if (interview.onsite_availability) {
    const slots = interview.onsite_availability.split("\n").filter(Boolean);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Availability Submitted!</h1>
          <p className="text-slate-400 mb-8">
            Thanks{interview.candidate_name ? `, ${interview.candidate_name.split(" ")[0]}` : ""}! 
            We&apos;ve received your availability and will be in touch soon to confirm your on-site interview.
          </p>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6 text-left">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Your selected times:</h3>
            <ul className="space-y-2">
              {slots.map((slot, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  {slot}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-500 font-medium">Interview Complete!</p>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            One Last Step{interview.candidate_name ? `, ${interview.candidate_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-400 mt-1">
            Let us know when you&apos;re available for an on-site interview.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Instructions */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-5 mb-8">
          <h2 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Select Your Availability
          </h2>
          <p className="text-slate-400 text-sm">
            Choose multiple date and time slots over the next 2 weeks when you could come in for 
            an on-site interview. The more options you provide, the easier it will be to find a 
            time that works for everyone.
          </p>
        </div>

        {/* Schedule Picker */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
          <OnsiteSchedulePicker interviewToken={token} />
        </div>
      </main>
    </div>
  );
}

