import OpenAI from "openai";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Dynamic import of pdf-parse to handle ESM/CJS compatibility
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text || "";
}

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
  
  // Interview focus areas
  interview_focus_areas: string[];
  suggested_questions: string[];
  
  // Overall assessment
  fit_score: number; // 1-10
  strengths: string[];
  concerns: string[];
}

/**
 * Build a dynamic resume parser prompt based on the job
 */
function buildResumeParserPrompt(jobTitle: string, jobDescription?: string): string {
  return `You are an AI assistant that analyzes resumes for a ${jobTitle} position.

${jobDescription ? `Job Description: ${jobDescription}\n` : ""}
Given the resume text, extract and analyze the following:

1. **Summary**: A 2-3 sentence summary of the candidate's background, focusing on relevance to ${jobTitle}
2. **Years of Experience**: Estimate total relevant work experience in years
3. **Relevant Experience**: List specific experiences relevant to ${jobTitle}
4. **Skills**: List all skills mentioned, especially those relevant to ${jobTitle}
5. **Education**: List education background

6. **Interview Focus Areas**: What topics should the interviewer explore for this ${jobTitle} role?
7. **Suggested Questions**: 2-3 specific questions to ask based on their background
8. **Fit Score**: Rate 1-10 how well they fit the ${jobTitle} role
9. **Strengths**: Top 3 strengths for this role
10. **Concerns**: Any concerns or gaps to address

Respond in JSON format:
{
  "summary": "string",
  "years_of_experience": number or null,
  "relevant_experience": ["string"],
  "skills": ["string"],
  "education": ["string"],
  "interview_focus_areas": ["string"],
  "suggested_questions": ["string"],
  "fit_score": number,
  "strengths": ["string"],
  "concerns": ["string"]
}`;
}

/**
 * Parse resume text using GPT-4o-mini with job context
 */
export async function parseResume(
  resumeText: string,
  jobTitle: string = "this position",
  jobDescription?: string
): Promise<ResumeAnalysis> {
  const prompt = buildResumeParserPrompt(jobTitle, jobDescription);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `Analyze this resume:\n\n${resumeText}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 500,
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

  const arrayBuffer = await data.arrayBuffer();
  const text = await extractTextFromBuffer(arrayBuffer, resumePath);

  return text;
}

/**
 * Extract text from file buffer using pdf-parse for PDFs
 */
async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.endsWith(".txt")) {
    return new TextDecoder().decode(buffer);
  }

  if (lowerName.endsWith(".pdf")) {
    try {
      // Use pdf-parse for robust PDF text extraction
      const pdfBuffer = Buffer.from(buffer);
      const text = await parsePDF(pdfBuffer);
      return text;
    } catch (e) {
      console.error("PDF parsing error:", e);
      // Fallback to basic extraction if pdf-parse fails
      return extractPDFTextBasic(new Uint8Array(buffer));
    }
  }

  if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    return "[Word document - text extraction not implemented. Please upload PDF.]";
  }

  return "";
}

/**
 * Basic PDF text extraction (fallback)
 */
function extractPDFTextBasic(data: Uint8Array): string {
  const str = new TextDecoder("latin1").decode(data);
  
  const textMatches = str.match(/\(([^)]+)\)/g) || [];
  const texts = textMatches
    .map(m => m.slice(1, -1))
    .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
    .join(" ");

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
  
  return combined
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a resume from storage and return analysis with job context
 */
export async function analyzeApplicationResume(
  applicationId: string
): Promise<{ analysis: ResumeAnalysis | null; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Get application with resume path AND job info
  const { data: app, error: appError } = await admin
    .from("applications")
    .select(`
      resume_path,
      job_postings (
        title,
        description
      )
    `)
    .eq("id", applicationId)
    .single();

  if (appError || !app?.resume_path) {
    return { analysis: null, error: "No resume found for this application" };
  }

  // Get job context
  const job = app.job_postings as unknown as { title: string; description?: string } | null;
  const jobTitle = job?.title || "this position";
  const jobDescription = job?.description;

  try {
    const resumeText = await extractResumeText(app.resume_path);
    
    if (!resumeText || resumeText.length < 50) {
      return { 
        analysis: null, 
        error: "Could not extract text from resume. Please ensure it's a text-based PDF." 
      };
    }

    // Parse with AI using job context
    const analysis = await parseResume(resumeText, jobTitle, jobDescription);

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
