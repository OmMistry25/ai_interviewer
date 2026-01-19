import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { autoDecide } from "@/lib/interview/scoring";
import { completeInterview } from "@/lib/interview/orchestrator";
import { updateFlagsSummary, cleanupTempAudio } from "@/lib/interview/flag-detector";

// Extend timeout for scoring (Vercel Pro: 60s max)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID required" },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Check if interview needs to be completed first
    const { data: interviewCheck } = await adminClient
      .from("interviews")
      .select("status")
      .eq("id", interviewId)
      .single();

    // If interview is still live, complete it now (backup for fire-and-forget)
    if (interviewCheck?.status === "live") {
      try {
        await completeInterview(interviewId);
      } catch (e) {
        console.error("completeInterview error in end route:", e);
        // Continue - we'll still try to finalize what we can
      }
    }

    // Get existing evaluation (should now be populated)
    const { data: evaluation } = await adminClient
      .from("evaluations")
      .select("scores, decision")
      .eq("interview_id", interviewId)
      .single();

    if (!evaluation) {
      // No evaluation data - return neutral result but don't error
      return NextResponse.json({
        scores: { totalScore: 0.5, signals: {} },
        decision: "hold",
        message: "Interview completed (no detailed scores)",
      });
    }

    // If decision already made, return it
    if (evaluation.decision) {
      return NextResponse.json({
        scores: evaluation.scores,
        decision: evaluation.decision,
        message: "Evaluation already finalized",
      });
    }

    // Calculate decision based on total score
    const scores = evaluation.scores as { totalScore?: number };
    const totalScore = scores?.totalScore ?? 0.5;
    const decision = autoDecide(totalScore);

    // Update with decision
    await adminClient
      .from("evaluations")
      .update({ decision })
      .eq("interview_id", interviewId);

    // Update linked application status to "interviewed"
    const { data: interview } = await adminClient
      .from("interviews")
      .select("application_id")
      .eq("id", interviewId)
      .single();

    if (interview?.application_id) {
      await adminClient
        .from("applications")
        .update({ status: "interviewed" })
        .eq("id", interview.application_id);
    }

    // Fire-and-forget: Update flags summary and clean up temp audio
    updateFlagsSummary(interviewId).catch(() => {});
    cleanupTempAudio(interviewId).catch(() => {});

    return NextResponse.json({
      scores: evaluation.scores,
      decision,
      message: "Evaluation complete",
    });
  } catch (error) {
    console.error("End interview error:", error);
    // Return success anyway so the flow continues to schedule page
    return NextResponse.json({
      scores: { totalScore: 0.5, signals: {} },
      decision: "hold",
      message: "Interview completed with partial data",
    });
  }
}
