"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplate } from "../actions";
import Link from "next/link";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createTemplate(name);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/admin/templates/${result.templateId}/edit`);
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create Template</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Barista Interview"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Template"}
          </button>
        </form>

        <div className="mt-8">
          <Link href="/admin/templates" className="text-zinc-400 hover:text-white">
            ← Back to Templates
          </Link>
        </div>
      </div>
    </div>
  );
}

