import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Extend timeout for TTS generation
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, interviewId, questionId, stream = true } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text required" },
        { status: 400 }
      );
    }

    // Persist AI turn if interviewId provided (don't wait for this)
    if (interviewId) {
      const adminClient = createSupabaseAdminClient();
      // Fire and forget - don't block TTS generation
      Promise.resolve(
        adminClient.from("interview_turns").insert({
          interview_id: interviewId,
          speaker: "ai",
          transcript: text,
          question_id: questionId || null,
        })
      ).catch(console.error);
    }

    // Generate speech using OpenAI TTS with streaming
    const response = await openai.audio.speech.create({
      model: "tts-1", // Use tts-1 for speed (tts-1-hd for quality)
      voice: "alloy",
      input: text,
      response_format: "mp3", // MP3 streams well
    });

    // If streaming is requested, return the stream directly
    if (stream && response.body) {
      // Get the readable stream from the response
      const audioStream = response.body;

      return new NextResponse(audioStream as unknown as ReadableStream, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Fallback: return complete audio buffer
    const audioBuffer = await response.arrayBuffer();

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
