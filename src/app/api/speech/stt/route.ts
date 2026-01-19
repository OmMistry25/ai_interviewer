import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Extend timeout for STT processing (Vercel Pro: 60s max)
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Save audio to temp storage for potential flag clips
 * Fire-and-forget: Never blocks STT response, errors are logged only
 */
async function saveAudioToTemp(
  audioBuffer: ArrayBuffer,
  interviewId: string,
  turnIndex: number
): Promise<void> {
  try {
    const adminClient = createSupabaseAdminClient();
    const filePath = `temp-audio/${interviewId}/${turnIndex}.wav`;

    const { error } = await adminClient.storage
      .from("interview-clips")
      .upload(filePath, audioBuffer, {
        contentType: "audio/wav",
        upsert: true, // Overwrite if exists (retry case)
      });

    if (error) {
      // Log but don't throw - this should never break STT
      console.error("[STT] Failed to save temp audio:", error.message);
    } else {
      console.log(`[STT] Saved temp audio: ${filePath}`);
    }
  } catch (error) {
    // Catch-all: never let storage errors affect transcription
    console.error("[STT] Error saving temp audio:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const interviewId = formData.get("interviewId") as string;
    const turnIndexStr = formData.get("turnIndex") as string;
    const turnIndex = turnIndexStr ? parseInt(turnIndexStr, 10) : null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file required" },
        { status: 400 }
      );
    }

    // Get audio buffer before sending to Whisper (needed for storage)
    const audioBuffer = await audioFile.arrayBuffer();

    // Recreate file for Whisper (original was consumed)
    const audioFileForWhisper = new File(
      [audioBuffer],
      audioFile.name || "audio.wav",
      { type: audioFile.type || "audio/wav" }
    );

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForWhisper,
      model: "whisper-1",
      language: "en",
    });

    const transcript = transcription.text;

    // Persist candidate turn if interviewId provided
    if (interviewId && transcript.trim()) {
      const adminClient = createSupabaseAdminClient();
      await adminClient.from("interview_turns").insert({
        interview_id: interviewId,
        speaker: "candidate",
        transcript: transcript,
      });
    }

    // Fire-and-forget: Save audio to temp storage for potential flag clips
    // This runs AFTER returning the response, so it doesn't block
    if (interviewId && turnIndex !== null && !isNaN(turnIndex)) {
      saveAudioToTemp(audioBuffer, interviewId, turnIndex).catch(() => {});
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}

