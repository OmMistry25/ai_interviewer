import { NextRequest, NextResponse } from "next/server";
import {
  loadInterviewState,
  getCurrentQuestion,
  startInterview,
  updateCurrentQuestion,
  getNextScreeningQuestion,
  updateDynamicState,
} from "@/lib/interview/orchestrator";

// Extend timeout (Vercel Pro: 60s max)
export const maxDuration = 60;

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

    // Branch based on interview mode
    if (state.mode === "dynamic") {
      // Dynamic mode: get first screening question
      const firstScreeningQ = getNextScreeningQuestion(state);
      
      if (!firstScreeningQ) {
        return NextResponse.json(
          { error: "No screening questions in template" },
          { status: 400 }
        );
      }

      // Initialize dynamic state
      await updateDynamicState(interviewId, {
        phase: "screening",
        conversationHistory: [],
        questionsAsked: 0,
        exitQuestionsAsked: 0,
      });

      return NextResponse.json({
        status: "started",
        mode: "dynamic",
        systemPrompt: state.config.system_prompt,
        question: {
          id: firstScreeningQ.id,
          prompt: firstScreeningQ.prompt,
        },
        phase: "screening",
      });
    }

    // Static mode (original): get first question from fixed array
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
      mode: "static",
      systemPrompt: state.config.system_prompt,
      question: {
        id: firstQuestion.id,
        prompt: firstQuestion.prompt,
      },
      questionIndex: 0,
      totalQuestions: state.config.questions?.length || 0,
    });
  } catch (error) {
    console.error("Start interview error:", error);
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 }
    );
  }
}

