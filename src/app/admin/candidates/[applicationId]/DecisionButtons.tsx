"use client";

import { useState } from "react";
import { updateDecision } from "./actions";

interface DecisionButtonsProps {
  applicationId: string;
  candidateEmail: string;
}

export function DecisionButtons({ applicationId, candidateEmail }: DecisionButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"accept" | "reject" | null>(null);

  async function handleDecision(decision: "accepted" | "rejected") {
    setLoading(true);
    await updateDecision(applicationId, decision);
    setLoading(false);
    setShowConfirm(null);
    window.location.reload();
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">
          {showConfirm === "accept" ? "Accept" : "Reject"} candidate?
        </span>
        <button
          onClick={() => handleDecision(showConfirm === "accept" ? "accepted" : "rejected")}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            showConfirm === "accept"
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-red-600 hover:bg-red-500"
          } text-white disabled:opacity-50`}
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(null)}
          disabled={loading}
          className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowConfirm("accept")}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
      >
        ✓ Accept
      </button>
      <button
        onClick={() => setShowConfirm("reject")}
        className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
      >
        ✗ Reject
      </button>
    </div>
  );
}

