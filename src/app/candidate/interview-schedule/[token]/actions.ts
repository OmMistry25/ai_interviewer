"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Submit on-site interview availability
 * This saves the availability to the database and triggers the webhook with updated data
 */
export async function submitOnsiteAvailability(
  interviewToken: string,
  availability: string // Line-separated date/time slots
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient();

  // Validate availability
  if (!availability?.trim()) {
    return { success: false, error: "Please select at least one time slot" };
  }

  // Find interview by token
  const { data: interview, error: findError } = await adminClient
    .from("interviews")
    .select("id, status, webhook_url, candidate_name, candidate_phone, candidate_email, access_token, scores, summary")
    .eq("access_token", interviewToken)
    .single();

  if (findError || !interview) {
    return { success: false, error: "Interview not found" };
  }

  if (interview.status !== "completed") {
    return { success: false, error: "Interview must be completed first" };
  }

  // Update interview with on-site availability
  const { error: updateError } = await adminClient
    .from("interviews")
    .update({
      onsite_availability: availability,
    })
    .eq("id", interview.id);

  if (updateError) {
    console.error("[submitOnsiteAvailability] Update error:", updateError);
    return { success: false, error: "Failed to save availability" };
  }

  // Re-trigger webhook with the availability data
  if (interview.webhook_url) {
    try {
      await triggerWebhookWithAvailability(interview, availability);
    } catch (e) {
      console.error("Webhook trigger error (non-blocking):", e);
      // Don't fail the submission if webhook fails
    }
  }

  return { success: true };
}

/**
 * Trigger webhook with on-site availability (called after scheduling is submitted)
 */
async function triggerWebhookWithAvailability(
  interview: {
    id: string;
    webhook_url: string;
    candidate_name?: string;
    candidate_phone?: string;
    candidate_email?: string;
    access_token?: string;
    scores?: unknown;
    summary?: string;
  },
  availability: string
): Promise<void> {
  const scoresObj = interview.scores as { 
    totalScore?: number; 
    signals?: Record<string, { score: number }>;
  } | null;
  
  const totalScore = scoresObj?.totalScore ?? 0;
  const signals = scoresObj?.signals || {};
  
  // Determine decision based on score
  let decision: "recommend" | "pass" | "hold" = "hold";
  if (totalScore >= 0.6) {
    decision = "recommend";
  } else if (totalScore < 0.4) {
    decision = "pass";
  }
  
  // Extract strengths and concerns from signals
  const strengths: string[] = [];
  const concerns: string[] = [];
  
  for (const [signal, data] of Object.entries(signals)) {
    const signalName = signal
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (data.score >= 0.7) {
      strengths.push(signalName);
    } else if (data.score < 0.4) {
      concerns.push(signalName);
    }
  }
  
  // Build interview URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usecliq.com";
  const interviewUrl = interview.access_token 
    ? `${baseUrl}/candidate/interview/${interview.access_token}`
    : null;
  
  // Prepare webhook payload with availability
  const payload = {
    interviewId: interview.id,
    candidateName: interview.candidate_name || "Unknown",
    candidatePhone: interview.candidate_phone || null,
    candidateEmail: interview.candidate_email || null,
    status: "completed",
    score: Math.round(totalScore * 100),
    decision,
    summary: interview.summary || "No summary available",
    strengths,
    concerns,
    interviewUrl,
    onsiteAvailability: availability,
    schedulingPending: false,
    completedAt: new Date().toISOString(),
  };
  
  // Send to webhook
  const response = await fetch(interview.webhook_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    console.error(`Webhook failed with status ${response.status}`);
    throw new Error(`Webhook failed: ${response.status}`);
  }
  
  console.log(`Webhook with availability sent for interview ${interview.id}`);
}







