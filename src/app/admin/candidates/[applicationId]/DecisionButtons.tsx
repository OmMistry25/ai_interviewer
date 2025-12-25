"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeDecision } from "./actions";

interface Props {
  applicationId: string;
}

export function DecisionButtons({ applicationId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDecision(decision: "accepted" | "rejected") {
    const confirmed = confirm(
      decision === "accepted"
        ? "Accept this candidate? They will receive an email notification."
        : "Reject this candidate? They will receive an email notification."
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    const result = await makeDecision(applicationId, decision);
    
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={() => handleDecision("accepted")}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
      >
        ✓ Accept Candidate
      </button>
      <button
        onClick={() => handleDecision("rejected")}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
      >
        ✗ Reject Candidate
      </button>
    </div>
  );
}
