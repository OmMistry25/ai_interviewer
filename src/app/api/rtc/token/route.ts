import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { validateInterviewToken } from "@/lib/interview/token";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { interviewToken } = await request.json();

    if (!interviewToken) {
      return NextResponse.json(
        { error: "Interview token required" },
        { status: 400 }
      );
    }

    // Validate interview token
    const session = await validateInterviewToken(interviewToken);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid interview token" },
        { status: 401 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Interview already completed" },
        { status: 400 }
      );
    }

    // Create LiveKit token
    const roomName = `interview-${session.interviewId}`;
    const participantName = session.candidateName;

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: `candidate-${session.interviewId}`,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      roomName,
      participantName,
      interviewId: session.interviewId,
    });
  } catch (error) {
    console.error("RTC token error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

