"use client";

import { useState } from "react";
import { createInterview } from "./actions";

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

  return (
    <form action={handleSubmit} className="space-y-4">
      {result?.error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {result.error}
        </div>
      )}

      {interviewUrl && (
        <div className="p-4 bg-emerald-900/50 border border-emerald-700 rounded-lg">
          <p className="text-emerald-300 text-sm mb-2">Interview created! Send this link to the candidate:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={interviewUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(interviewUrl)}
              className="px-3 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Template
          </label>
          <select
            name="templateId"
            required
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Candidate Name
          </label>
          <input
            type="text"
            name="candidateName"
            required
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Candidate Email
          </label>
          <input
            type="email"
            name="candidateEmail"
            required
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || templates.length === 0}
        className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Interview"}
      </button>

      {templates.length === 0 && (
        <p className="text-yellow-400 text-sm">
          No published templates available. Create and publish a template first.
        </p>
      )}
    </form>
  );
}
