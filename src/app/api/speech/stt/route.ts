import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Extend timeout for STT processing (Vercel Pro: 60s max)
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const interviewId = formData.get("interviewId") as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file required" },
        { status: 400 }
      );
    }

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
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

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}

