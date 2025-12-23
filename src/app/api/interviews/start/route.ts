import { NextRequest, NextResponse } from "next/server";
import {
  loadInterviewState,
  getCurrentQuestion,
  startInterview,
  updateCurrentQuestion,
} from "@/lib/interview/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID required" },
        { status: 400 }
      );
    }

    const state = await loadInterviewState(interviewId);
    if (!state) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (state.status === "completed") {
      return NextResponse.json(
        { error: "Interview already completed" },
        { status: 400 }
      );
    }

    // Mark as live
    await startInterview(interviewId);

    // Get first question
    const firstQuestion = getCurrentQuestion(state);
    if (!firstQuestion) {
      return NextResponse.json(
        { error: "No questions in template" },
        { status: 400 }
      );
    }

    // Update current question
    await updateCurrentQuestion(interviewId, firstQuestion.id);

    return NextResponse.json({
      status: "started",
      systemPrompt: state.config.system_prompt,
      question: {
        id: firstQuestion.id,
        prompt: firstQuestion.prompt,
      },
      questionIndex: 0,
      totalQuestions: state.config.questions.length,
    });
  } catch (error) {
    console.error("Start interview error:", error);
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 }
    );
  }
}

