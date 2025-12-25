import { validateInterviewToken } from "@/lib/interview/token";
import { InterviewRoom } from "./InterviewRoom";

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
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Invalid Interview Link</h1>
          <p className="text-zinc-400">
            This interview link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Interview Completed</h1>
          <p className="text-zinc-400">
            This interview has already been completed. Thank you!
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

