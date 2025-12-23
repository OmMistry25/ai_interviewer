"use client";

import { useState } from "react";
import { createInterview } from "./actions";

interface Template {
  id: string;
  name: string;
}

export function CreateInterviewForm({ templates }: { templates: Template[] }) {
  const [result, setResult] = useState<{ accessToken?: string; error?: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    const res = await createInterview(formData);
    setResult(res);
  };

  return (
    <div className="mb-8 p-4 bg-zinc-800 rounded">
      <h2 className="text-lg font-semibold text-white mb-4">Create Interview</h2>
      
      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            name="candidateName"
            type="text"
            placeholder="Candidate Name"
            required
            className="p-3 rounded bg-zinc-700 text-white border border-zinc-600"
          />
          <input
            name="candidateEmail"
            type="email"
            placeholder="Candidate Email (optional)"
            className="p-3 rounded bg-zinc-700 text-white border border-zinc-600"
          />
        </div>
        <select
          name="templateId"
          required
          className="w-full p-3 rounded bg-zinc-700 text-white border border-zinc-600"
        >
          <option value="">Select Template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-6 py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Create Interview
        </button>
      </form>

      {result?.accessToken && (
        <div className="mt-4 p-4 bg-green-900/30 rounded border border-green-700">
          <p className="text-green-400 font-medium mb-2">Interview Created!</p>
          <p className="text-zinc-300 text-sm mb-1">Share this link with the candidate:</p>
          <code className="block p-2 bg-zinc-900 rounded text-sm text-zinc-200 break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/candidate/interview/{result.accessToken}
          </code>
        </div>
      )}

      {result?.error && (
        <p className="mt-4 text-red-400">{result.error}</p>
      )}
    </div>
  );
}

