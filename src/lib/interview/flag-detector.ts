/**
 * Flag Detector - Analyzes Q&A turns for notable red/green flags
 * 
 * DESIGN PRINCIPLES:
 * - Async/fire-and-forget: Never blocks interview flow
 * - Fail-safe: Errors are logged, never thrown to caller
 * - Lightweight: Uses GPT-4o-mini with minimal tokens
 * - Selective: Only flags truly notable moments (not every answer)
 */

import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Flag types
export type FlagType = "red" | "green";

// Categories of flags
export type FlagCategory = 
  | "enthusiasm"      // High/low energy, genuine interest
  | "experience"      // Strong/weak relevant experience
  | "communication"   // Excellent/poor articulation
  | "problem_solving" // Strong/weak analytical thinking
  | "red_flag"        // Concerning behavior (negativity, dishonesty hints)
  | "standout"        // Exceptionally impressive moment
  | "concern";        // General concern

export interface InterviewFlag {
  turnIndex: number;
  flagType: FlagType;
  category: FlagCategory;
  description: string;
  quote?: string; // Key quote that triggered the flag
  shouldSaveClip: boolean;
}

export interface RoleContext {
  job_title?: string;
  required_skills?: string[];
  company_values?: string[];
}

/**
 * Detect flags in a Q&A turn
 * Returns null if the turn is neutral (not notable)
 * 
 * This is designed to be called asynchronously - errors are caught and logged
 */
export async function detectFlags(
  question: string,
  answer: string,
  turnIndex: number,
  roleContext?: RoleContext
): Promise<InterviewFlag | null> {
  // Skip very short answers - not enough to flag
  if (answer.trim().length < 20) {
    return null;
  }

  const jobTitle = roleContext?.job_title || "the position";
  
  const prompt = `Analyze this interview Q&A for the ${jobTitle} role. Only flag if TRULY notable (top/bottom 20% of responses).

Q: "${question}"
A: "${answer}"

ONLY flag if the answer shows:
- RED FLAG: Concerning behavior, vague non-answers, negativity, potential dishonesty, unprofessional
- GREEN FLAG: Exceptional enthusiasm, specific impressive examples, outstanding communication, standout qualities

Most answers are NEUTRAL - only flag truly notable moments worth highlighting to a hiring manager.

If flagging, respond with JSON:
{"flag": true, "type": "red|green", "category": "enthusiasm|experience|communication|problem_solving|red_flag|standout|concern", "description": "1 sentence why", "quote": "key phrase from answer"}

If neutral (most cases), respond:
{"flag": false}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a hiring manager assistant. Be selective - only flag truly notable moments. Most answers are neutral." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 100, // Keep it fast
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    
    if (!parsed.flag) {
      return null; // Neutral answer
    }

    return {
      turnIndex,
      flagType: parsed.type as FlagType,
      category: parsed.category as FlagCategory,
      description: parsed.description || "Notable moment",
      quote: parsed.quote,
      shouldSaveClip: true, // Always save clip for flagged moments
    };
  } catch (error) {
    // Log but don't throw - this should never break the interview
    console.error("[FlagDetector] Error detecting flags:", error);
    return null;
  }
}

/**
 * Store a flag in the database
 * Fire-and-forget - errors are logged, not thrown
 */
export async function storeFlag(
  interviewId: string,
  flag: InterviewFlag,
  questionText: string,
  answerText: string
): Promise<string | null> {
  try {
    const adminClient = createSupabaseAdminClient();
    
    const { data, error } = await adminClient
      .from("interview_flags")
      .insert({
        interview_id: interviewId,
        turn_index: flag.turnIndex,
        flag_type: flag.flagType,
        category: flag.category,
        description: flag.description,
        quote: flag.quote,
        question_text: questionText,
        answer_text: answerText,
        // clip_path will be updated later when audio is uploaded
      })
      .select("id")
      .single();

    if (error) {
      console.error("[FlagDetector] Error storing flag:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("[FlagDetector] Error storing flag:", error);
    return null;
  }
}

/**
 * Update interview with flags summary
 * Called at interview completion
 */
export async function updateFlagsSummary(interviewId: string): Promise<void> {
  try {
    const adminClient = createSupabaseAdminClient();
    
    // Count flags by type
    const { data: flags } = await adminClient
      .from("interview_flags")
      .select("flag_type")
      .eq("interview_id", interviewId);

    if (!flags || flags.length === 0) {
      return;
    }

    const summary = {
      red: flags.filter(f => f.flag_type === "red").length,
      green: flags.filter(f => f.flag_type === "green").length,
      total: flags.length,
    };

    await adminClient
      .from("interviews")
      .update({ flags_summary: summary })
      .eq("id", interviewId);
  } catch (error) {
    console.error("[FlagDetector] Error updating flags summary:", error);
  }
}

/**
 * Main function to detect and store flags for a turn
 * This is the function called from the interview flow (fire-and-forget)
 * 
 * IMPORTANT: This function catches all errors internally.
 * It should NEVER throw or affect the interview flow.
 */
export async function detectAndStoreFlagBackground(
  interviewId: string,
  turnIndex: number,
  question: string,
  answer: string,
  roleContext?: RoleContext
): Promise<void> {
  try {
    const flag = await detectFlags(question, answer, turnIndex, roleContext);
    
    if (flag) {
      await storeFlag(interviewId, flag, question, answer);
      console.log(`[FlagDetector] ${flag.flagType.toUpperCase()} flag stored for interview ${interviewId}, turn ${turnIndex}`);
    }
  } catch (error) {
    // Catch-all safety net - should never reach here, but just in case
    console.error("[FlagDetector] Unexpected error in background processing:", error);
  }
}

/**
 * Get pending flags that need audio clips uploaded
 */
export async function getPendingClipFlags(interviewId: string): Promise<{
  id: string;
  turn_index: number;
  flag_type: FlagType;
}[]> {
  try {
    const adminClient = createSupabaseAdminClient();
    
    const { data, error } = await adminClient
      .from("interview_flags")
      .select("id, turn_index, flag_type")
      .eq("interview_id", interviewId)
      .is("clip_path", null);

    if (error) {
      console.error("[FlagDetector] Error getting pending clips:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[FlagDetector] Error getting pending clips:", error);
    return [];
  }
}

/**
 * Update flag with clip path after audio upload
 */
export async function updateFlagClipPath(
  flagId: string,
  clipPath: string,
  clipDurationMs: number
): Promise<boolean> {
  try {
    const adminClient = createSupabaseAdminClient();
    
    const { error } = await adminClient
      .from("interview_flags")
      .update({ 
        clip_path: clipPath,
        clip_duration_ms: clipDurationMs,
      })
      .eq("id", flagId);

    if (error) {
      console.error("[FlagDetector] Error updating clip path:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[FlagDetector] Error updating clip path:", error);
    return false;
  }
}


