"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeDecision } from "./actions";
import { Button } from "@/components/ui/Button";
import { CheckCircle, XCircle } from "lucide-react";

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
      <Button
        onClick={() => handleDecision("accepted")}
        disabled={loading}
        variant="primary"
        size="lg"
        className="flex-1"
        icon={<CheckCircle className="w-5 h-5" />}
      >
        Accept Candidate
      </Button>
      <Button
        onClick={() => handleDecision("rejected")}
        disabled={loading}
        variant="danger"
        size="lg"
        className="flex-1"
        icon={<XCircle className="w-5 h-5" />}
      >
        Reject Candidate
      </Button>
    </div>
  );
}
