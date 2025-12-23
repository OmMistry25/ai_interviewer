import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { autoDecide } from "@/lib/interview/scoring";

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

    // Get existing evaluation (populated during interview)
    const { data: evaluation } = await adminClient
      .from("evaluations")
      .select("scores, decision")
      .eq("interview_id", interviewId)
      .single();

    if (!evaluation) {
      return NextResponse.json({
        scores: { totalScore: 0, signals: {} },
        decision: "hold",
        message: "No evaluation data found",
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
    const totalScore = scores?.totalScore ?? 0;
    const decision = autoDecide(totalScore);

    // Update with decision
    await adminClient
      .from("evaluations")
      .update({ decision })
      .eq("interview_id", interviewId);

    return NextResponse.json({
      scores: evaluation.scores,
      decision,
      message: "Evaluation complete",
    });
  } catch (error) {
    console.error("End interview error:", error);
    return NextResponse.json(
      { error: "Failed to finalize interview" },
      { status: 500 }
    );
  }
}
