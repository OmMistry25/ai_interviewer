import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, interviewId, questionId } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text required" },
        { status: 400 }
      );
    }

    // Generate speech using OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();

    // Persist AI turn if interviewId provided
    if (interviewId) {
      const adminClient = createSupabaseAdminClient();
      await adminClient.from("interview_turns").insert({
        interview_id: interviewId,
        speaker: "ai",
        transcript: text,
        question_id: questionId || null,
      });
    }

    // Return audio as binary
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

