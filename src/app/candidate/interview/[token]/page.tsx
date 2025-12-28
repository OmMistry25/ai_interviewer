import { validateInterviewToken } from "@/lib/interview/token";
import { InterviewRoom } from "./InterviewRoom";
import { AlertCircle, CheckCircle } from "lucide-react";

type Params = Promise<{ token: string }>;

export default async function CandidateInterviewPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  
  const session = await validateInterviewToken(token);

  if (!session) {
    return (
      <div className="h-screen w-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Invalid Interview Link</h1>
          <p className="text-slate-400">
            This interview link is invalid or has expired. Please check your email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="h-screen w-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Interview Completed</h1>
          <p className="text-slate-400">
            This interview has already been completed. Thank you for your time!
          </p>
        </div>
      </div>
    );
  }

  return (
    <InterviewRoom 
      interviewToken={token} 
      candidateName={session.candidateName} 
    />
  );
}
