import { NextRequest, NextResponse } from "next/server";
import { analyzeApplicationResume } from "@/lib/resume/parser";

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID required" },
        { status: 400 }
      );
    }

    const { analysis, error } = await analyzeApplicationResume(applicationId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("Resume analysis API error:", e);
    return NextResponse.json(
      { error: "Failed to analyze resume" },
      { status: 500 }
    );
  }
}

