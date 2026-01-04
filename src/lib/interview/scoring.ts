import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TemplateConfig, Question } from "@/types/template";

export interface ScoreAccumulator {
  [signal: string]: {
    totalScore: number;
    weight: number;
    count: number;
  };
}

export interface FinalScore {
  totalScore: number;
  signals: {
    [signal: string]: {
      score: number;
      weightedScore: number;
      weight: number;
    };
  };
}

/**
 * Initialize score accumulator (Task 12.1)
 * For static mode templates with questions array
 */
export function initializeScores(config: TemplateConfig): ScoreAccumulator {
  const accumulator: ScoreAccumulator = {};

  // Handle dynamic mode templates that don't have fixed questions
  if (!config.questions) {
    return accumulator;
  }

  for (const question of config.questions) {
    if (question.rubric) {
      const signal = question.rubric.signal;
      if (!accumulator[signal]) {
        accumulator[signal] = {
          totalScore: 0,
          weight: question.rubric.weight,
          count: 0,
        };
      }
    }
  }

  return accumulator;
}

/**
 * Apply rubric weight (Task 12.2)
 */
export function addScore(
  accumulator: ScoreAccumulator,
  question: Question,
  rawScore: number
): void {
  if (!question.rubric) return;

  const signal = question.rubric.signal;
  if (!accumulator[signal]) {
    accumulator[signal] = {
      totalScore: 0,
      weight: question.rubric.weight,
      count: 0,
    };
  }

  accumulator[signal].totalScore += rawScore;
  accumulator[signal].count += 1;
}

/**
 * Compute total score (Task 12.3)
 */
export function computeFinalScore(accumulator: ScoreAccumulator): FinalScore {
  const signals: FinalScore["signals"] = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [signal, data] of Object.entries(accumulator)) {
    const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
    const weightedScore = avgScore * data.weight;

    signals[signal] = {
      score: avgScore,
      weightedScore,
      weight: data.weight,
    };

    totalWeightedScore += weightedScore;
    totalWeight += data.weight;
  }

  // Normalize to 0-1 scale
  const totalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    totalScore,
    signals,
  };
}

/**
 * Persist evaluation (Task 12.4)
 */
export async function persistEvaluation(
  interviewId: string,
  finalScore: FinalScore,
  decision?: "advance" | "hold" | "reject"
): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  await adminClient.from("evaluations").upsert(
    {
      interview_id: interviewId,
      scores: finalScore,
      decision: decision || null,
    },
    {
      onConflict: "interview_id",
    }
  );
}

/**
 * Auto-decide based on score thresholds
 */
export function autoDecide(
  totalScore: number
): "advance" | "hold" | "reject" {
  if (totalScore >= 0.7) return "advance";
  if (totalScore >= 0.4) return "hold";
  return "reject";
}

