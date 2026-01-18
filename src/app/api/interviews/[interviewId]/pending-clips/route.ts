import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/interviews/[interviewId]/pending-clips
 * Returns list of flags that need audio clips uploaded
 * Called by client to check if any clips need uploading
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID required" },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Get flags that don't have clips yet
    const { data: pendingFlags, error } = await adminClient
      .from("interview_flags")
      .select("id, turn_index, flag_type, category")
      .eq("interview_id", interviewId)
      .is("clip_path", null)
      .order("turn_index", { ascending: true });

    if (error) {
      console.error("Error fetching pending clips:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending clips" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pendingClips: pendingFlags || [],
      count: pendingFlags?.length || 0,
    });
  } catch (error) {
    console.error("Pending clips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


