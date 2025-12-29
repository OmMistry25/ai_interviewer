"use client";

import { useState, useRef } from "react";
import { submitWaitlistApplication } from "./actions";
import { CheckCircle, FileText, Upload, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface GeneralApplyFormProps {
  defaultLocation?: string;
}

export function GeneralApplyForm({ defaultLocation }: GeneralApplyFormProps) {
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
    
    // Add resume file if present
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }

    const result = await submitWaitlistApplication(formData);

    if (!result.success) {
      setError(result.error || "Failed to submit application");
      setLoading(false);
      return;
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
        <h3 className="text-2xl font-bold text-slate-100 mb-2">You&apos;re on the List!</h3>
        <p className="text-slate-400 mb-6">
          We&apos;ll reach out when opportunities open in your area.
        </p>
        <p className="text-sm text-slate-500">
          Keep an eye on your inbox for updates.
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
          <MapPin className="w-4 h-4 inline mr-1" />
          Preferred Location *
        </label>
        <input
          type="text"
          name="location"
          defaultValue={defaultLocation || ""}
          required
          placeholder="City, State (e.g., Champaign, IL)"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Resume (Optional)
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
            ${resumeFile 
              ? "border-emerald-500/50 bg-emerald-500/10" 
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
            <div className="flex items-center justify-center gap-2 text-emerald-400">
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
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {loading ? "Submitting..." : "Join the Network"}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        We&apos;ll notify you when opportunities open in your area.
      </p>
    </form>
  );
}

