"use client";

import { useState, useRef } from "react";
import { submitApplication, uploadApplicationResume } from "./actions";
import { CheckCircle, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mb-2">Application Submitted!</h3>
        <p className="text-slate-400 mb-6">
          Thank you for applying. You&apos;ll receive an email with next steps shortly.
        </p>
        <p className="text-sm text-slate-500">
          Check your inbox for a link to schedule your interview.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          name="first_name"
          label="First Name *"
          required
          placeholder="John"
        />
        <Input
          type="text"
          name="last_name"
          label="Last Name *"
          required
          placeholder="Doe"
        />
      </div>

      <Input
        type="email"
        name="email"
        label="Email Address *"
        required
        placeholder="john@example.com"
      />

      <Input
        type="tel"
        name="phone"
        label="Phone Number"
        placeholder="(555) 123-4567"
      />

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Resume
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
            ${resumeFile 
              ? "border-amber-500/50 bg-amber-500/10" 
              : "border-slate-700/60 hover:border-slate-600 bg-slate-800/30"
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
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <FileText className="w-5 h-5" />
              <span className="font-medium">{resumeFile.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setResumeFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="ml-2 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-slate-400 text-sm">
                Click to upload or drag and drop
              </p>
              <p className="text-slate-600 text-xs mt-1">
                PDF or Word (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {loading ? (
          step === "uploading" ? "Uploading Resume..." : "Submitting..."
        ) : (
          "Submit Application"
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        By submitting, you agree to participate in an AI-powered video interview.
      </p>
    </form>
  );
}
