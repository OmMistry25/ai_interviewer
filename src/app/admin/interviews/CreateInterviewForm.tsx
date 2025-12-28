"use client";

import { useState } from "react";
import { createInterview } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { CheckCircle, Copy, AlertCircle } from "lucide-react";

interface Props {
  templates: { id: string; name: string }[];
}

export function CreateInterviewForm({ templates }: Props) {
  const [result, setResult] = useState<{
    success?: boolean;
    token?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);

    const res = await createInterview(formData);
    setResult(res);
    setLoading(false);
  }

  const interviewUrl = result?.token
    ? `${window.location.origin}/candidate/interview/${result.token}`
    : null;

  function handleCopy() {
    if (interviewUrl) {
      navigator.clipboard.writeText(interviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {result?.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {result.error}
        </div>
      )}

      {interviewUrl && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-3">
            <CheckCircle className="w-4 h-4" />
            Interview created! Send this link to the candidate:
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={interviewUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-300"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              icon={<Copy className="w-4 h-4" />}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select name="templateId" label="Template" required>
          <option value="">Select template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>

        <Input
          type="text"
          name="candidateName"
          label="Candidate Name"
          required
          placeholder="John Doe"
        />

        <Input
          type="email"
          name="candidateEmail"
          label="Candidate Email"
          required
          placeholder="john@example.com"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={loading || templates.length === 0}
          variant="primary"
        >
          {loading ? "Creating..." : "Create Interview"}
        </Button>

        {templates.length === 0 && (
          <p className="text-amber-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            No published templates. Create and publish a template first.
          </p>
        )}
      </div>
    </form>
  );
}
