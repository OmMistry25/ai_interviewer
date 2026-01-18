import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/interviews/[interviewId]/clips
 * Upload an audio clip for a specific flag
 * 
 * Body (FormData):
 * - flagId: UUID of the flag to attach clip to
 * - audio: WAV file blob
 * - durationMs: Duration of the clip in milliseconds
 */
export async function POST(
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

    const formData = await request.formData();
    const flagId = formData.get("flagId") as string;
    const audioFile = formData.get("audio") as File;
    const durationMs = parseInt(formData.get("durationMs") as string) || 0;

    if (!flagId || !audioFile) {
      return NextResponse.json(
        { error: "flagId and audio file required" },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Verify the flag exists and belongs to this interview
    const { data: flag, error: flagError } = await adminClient
      .from("interview_flags")
      .select("id, interview_id, clip_path")
      .eq("id", flagId)
      .eq("interview_id", interviewId)
      .single();

    if (flagError || !flag) {
      return NextResponse.json(
        { error: "Flag not found or doesn't belong to this interview" },
        { status: 404 }
      );
    }

    // Skip if clip already uploaded
    if (flag.clip_path) {
      return NextResponse.json({
        success: true,
        message: "Clip already uploaded",
        clipPath: flag.clip_path,
      });
    }

    // Generate unique path for the clip
    const timestamp = Date.now();
    const clipPath = `interview-clips/${interviewId}/${flagId}_${timestamp}.wav`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await audioFile.arrayBuffer();

    // Upload to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from("interview-clips")
      .upload(clipPath, arrayBuffer, {
        contentType: "audio/wav",
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist, log helpful message
      if (uploadError.message?.includes("Bucket not found")) {
        console.error(
          "[Clips] Storage bucket 'interview-clips' not found. Please create it in Supabase."
        );
        return NextResponse.json(
          { error: "Storage not configured. Please create 'interview-clips' bucket." },
          { status: 500 }
        );
      }
      
      console.error("Error uploading clip:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload clip" },
        { status: 500 }
      );
    }

    // Update flag with clip path
    const { error: updateError } = await adminClient
      .from("interview_flags")
      .update({
        clip_path: clipPath,
        clip_duration_ms: durationMs,
      })
      .eq("id", flagId);

    if (updateError) {
      console.error("Error updating flag with clip path:", updateError);
      // Still return success since clip was uploaded
    }

    return NextResponse.json({
      success: true,
      clipPath,
      durationMs,
    });
  } catch (error) {
    console.error("Clip upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interviews/[interviewId]/clips
 * Get signed URLs for all clips in an interview
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

    // Get all flags with clips
    const { data: flags, error } = await adminClient
      .from("interview_flags")
      .select("id, turn_index, flag_type, category, clip_path, clip_duration_ms")
      .eq("interview_id", interviewId)
      .not("clip_path", "is", null);

    if (error) {
      console.error("Error fetching clips:", error);
      return NextResponse.json(
        { error: "Failed to fetch clips" },
        { status: 500 }
      );
    }

    // Generate signed URLs for each clip
    const clipsWithUrls = await Promise.all(
      (flags || []).map(async (flag) => {
        if (!flag.clip_path) return { ...flag, clipUrl: null };

        const { data: signedUrl } = await adminClient.storage
          .from("interview-clips")
          .createSignedUrl(flag.clip_path, 3600); // 1 hour expiry

        return {
          ...flag,
          clipUrl: signedUrl?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({
      clips: clipsWithUrls,
      count: clipsWithUrls.length,
    });
  } catch (error) {
    console.error("Get clips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


