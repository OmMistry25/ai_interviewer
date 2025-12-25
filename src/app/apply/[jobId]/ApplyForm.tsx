"use client";

import { useState, useRef } from "react";
import { submitApplication, uploadApplicationResume } from "./actions";

interface ApplyFormProps {
  jobId: string;
}

export function ApplyForm({ jobId }: ApplyFormProps) {
  const [step, setStep] = useState<"form" | "uploading" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Step 1: Submit application
    const result = await submitApplication(jobId, formData);

    if (!result.success) {
      setError(result.error || "Failed to submit application");
      setLoading(false);
      return;
    }

    // Step 2: Upload resume if provided
    if (resumeFile && result.applicationId) {
      setStep("uploading");
      const resumeFormData = new FormData();
      resumeFormData.append("resume", resumeFile);

      const uploadResult = await uploadApplicationResume(
        result.applicationId,
        resumeFormData
      );

      if (!uploadResult.success) {
        // Application was created but resume failed - still show success
        console.error("Resume upload failed:", uploadResult.error);
      }
    }

    setStep("success");
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  }

  if (step === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Application Submitted!</h3>
        <p className="text-zinc-400 mb-6">
          Thank you for applying. You&apos;ll receive an email with next steps shortly.
        </p>
        <p className="text-sm text-zinc-500">
          Check your inbox for a link to schedule your interview.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            required
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            required
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          name="email"
          required
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          name="phone"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Resume
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${resumeFile 
              ? "border-emerald-500 bg-emerald-500/10" 
              : "border-zinc-700 hover:border-zinc-600 bg-zinc-900"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          {resumeFile ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">{resumeFile.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setResumeFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="ml-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 mx-auto text-zinc-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-zinc-400 text-sm">
                Click to upload or drag and drop
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                PDF or Word (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          step === "uploading" ? "Uploading Resume..." : "Submitting..."
        ) : (
          "Submit Application"
        )}
      </button>

      <p className="text-xs text-zinc-500 text-center">
        By submitting, you agree to participate in an AI-powered video interview.
      </p>
    </form>
  );
}

