import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface ResumeAnalysis {
  // Extracted info
  summary: string;
  years_of_experience: number | null;
  relevant_experience: string[];
  skills: string[];
  education: string[];
  
  // Barista-specific signals
  customer_service_experience: boolean;
  food_service_experience: boolean;
  cash_handling_experience: boolean;
  
  // Interview focus areas
  interview_focus_areas: string[];
  suggested_questions: string[];
  
  // Overall assessment
  fit_score: number; // 1-10
  strengths: string[];
  concerns: string[];
}

const RESUME_PARSER_PROMPT = `You are an AI assistant that analyzes resumes for barista/cafe positions. 

Given the resume text, extract and analyze the following:

1. **Summary**: A 2-3 sentence summary of the candidate's background
2. **Years of Experience**: Estimate total work experience in years
3. **Relevant Experience**: List specific experiences relevant to barista/cafe work
4. **Skills**: List all skills mentioned
5. **Education**: List education background

6. **Barista-Specific Signals**:
   - Has customer service experience? (true/false)
   - Has food service experience? (true/false)
   - Has cash handling experience? (true/false)

7. **Interview Focus Areas**: What topics should the interviewer explore?
8. **Suggested Questions**: 2-3 specific questions to ask based on their background
9. **Fit Score**: Rate 1-10 how well they fit a barista role
10. **Strengths**: Top 3 strengths for this role
11. **Concerns**: Any concerns or gaps to address

Respond in JSON format matching this schema:
{
  "summary": "string",
  "years_of_experience": number or null,
  "relevant_experience": ["string"],
  "skills": ["string"],
  "education": ["string"],
  "customer_service_experience": boolean,
  "food_service_experience": boolean,
  "cash_handling_experience": boolean,
  "interview_focus_areas": ["string"],
  "suggested_questions": ["string"],
  "fit_score": number,
  "strengths": ["string"],
  "concerns": ["string"]
}`;

/**
 * Parse resume text using GPT-4o-mini
 */
export async function parseResume(resumeText: string): Promise<ResumeAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RESUME_PARSER_PROMPT },
      { role: "user", content: `Analyze this resume:\n\n${resumeText}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from resume parser");
  }

  return JSON.parse(content) as ResumeAnalysis;
}

/**
 * Extract text from a PDF resume stored in Supabase
 */
export async function extractResumeText(resumePath: string): Promise<string> {
  const admin = createSupabaseAdminClient();

  // Download the file
  const { data, error } = await admin.storage
    .from("resumes")
    .download(resumePath);

  if (error || !data) {
    throw new Error(`Failed to download resume: ${error?.message}`);
  }

  // For PDF files, we'll use a simple text extraction
  // In production, you might want to use a proper PDF parser library
  const arrayBuffer = await data.arrayBuffer();
  const text = await extractTextFromBuffer(arrayBuffer, resumePath);

  return text;
}

/**
 * Simple text extraction from file buffer
 * For PDFs, this is a basic extraction - consider using pdf-parse in production
 */
async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  // For text-based files
  if (filename.endsWith(".txt")) {
    return new TextDecoder().decode(buffer);
  }

  // For PDFs, we'll do basic text extraction
  // This is simplified - in production use pdf-parse or similar
  if (filename.endsWith(".pdf")) {
    const uint8Array = new Uint8Array(buffer);
    const text = extractPDFText(uint8Array);
    return text;
  }

  // For Word docs, return placeholder (would need mammoth.js or similar)
  if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
    // In production, use mammoth.js to extract text from Word docs
    return "[Word document - text extraction not implemented. Please upload PDF.]";
  }

  return "";
}

/**
 * Basic PDF text extraction
 * This extracts visible text strings from PDF - for production, use pdf-parse
 */
function extractPDFText(data: Uint8Array): string {
  // Convert to string and look for text objects
  const str = new TextDecoder("latin1").decode(data);
  
  // Extract text between parentheses (PDF text objects)
  const textMatches = str.match(/\(([^)]+)\)/g) || [];
  const texts = textMatches
    .map(m => m.slice(1, -1))
    .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
    .join(" ");

  // Also try to extract text from streams (more complex PDFs)
  const streamMatches = str.match(/BT[\s\S]*?ET/g) || [];
  const streamTexts = streamMatches
    .flatMap(block => {
      const tjMatches = block.match(/\[([^\]]+)\]\s*TJ/g) || [];
      return tjMatches.map(tj => {
        const parts = tj.match(/\(([^)]+)\)/g) || [];
        return parts.map(p => p.slice(1, -1)).join("");
      });
    })
    .join(" ");

  const combined = `${texts} ${streamTexts}`.trim();
  
  // Clean up the text
  return combined
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a resume from storage and return analysis
 */
export async function analyzeApplicationResume(
  applicationId: string
): Promise<{ analysis: ResumeAnalysis | null; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Get application with resume path
  const { data: app, error: appError } = await admin
    .from("applications")
    .select("resume_path")
    .eq("id", applicationId)
    .single();

  if (appError || !app?.resume_path) {
    return { analysis: null, error: "No resume found for this application" };
  }

  try {
    // Extract text from resume
    const resumeText = await extractResumeText(app.resume_path);
    
    if (!resumeText || resumeText.length < 50) {
      return { 
        analysis: null, 
        error: "Could not extract text from resume. Please ensure it's a text-based PDF." 
      };
    }

    // Parse with AI
    const analysis = await parseResume(resumeText);

    // Save analysis to application
    await admin
      .from("applications")
      .update({ resume_analysis: analysis })
      .eq("id", applicationId);

    return { analysis };
  } catch (e) {
    console.error("Resume analysis error:", e);
    return { 
      analysis: null, 
      error: e instanceof Error ? e.message : "Failed to analyze resume" 
    };
  }
}

