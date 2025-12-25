"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTemplateVersion, publishTemplateVersion } from "../../actions";
import Link from "next/link";

interface Props {
  versionId: string;
  initialConfig: Record<string, unknown>;
  status: string;
}

export function TemplateEditor({ versionId, initialConfig, status }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(JSON.stringify(initialConfig, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsed = JSON.parse(config);
      const result = await updateTemplateVersion(versionId, parsed);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Saved!");
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (e) {
      setError("Invalid JSON format");
    }

    setLoading(false);
  }

  async function handlePublish() {
    setLoading(true);
    setError(null);

    // Save first
    try {
      const parsed = JSON.parse(config);
      await updateTemplateVersion(versionId, parsed);
    } catch (e) {
      setError("Invalid JSON format");
      setLoading(false);
      return;
    }

    const result = await publishTemplateVersion(versionId);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-300">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Template Configuration (JSON)
        </label>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-[500px] px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          spellCheck={false}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Draft"}
        </button>

        <button
          onClick={handlePublish}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Publishing..." : status === "published" ? "Update & Republish" : "Publish"}
        </button>
      </div>

      <div className="pt-4 border-t border-zinc-700">
        <Link href="/admin/templates" className="text-zinc-400 hover:text-white">
          ← Back to Templates
        </Link>
      </div>

      <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <h3 className="font-medium mb-2">Template JSON Structure</h3>
        <pre className="text-xs text-zinc-400 overflow-x-auto">
{`{
  "system_prompt": "You are a professional interviewer...",
  "voice": { "voice_id": "alloy", "speed": 1.0 },
  "questions": [
    {
      "id": "intro",
      "prompt": "Please introduce yourself...",
      "followups": [
        { "condition": "vague", "prompt": "Can you be more specific?" }
      ],
      "rubric": { "signal": "communication", "weight": 0.3 }
    }
  ],
  "policies": {
    "max_followups_per_question": 1,
    "min_answer_seconds": 5
  }
}`}
        </pre>
      </div>
    </div>
  );
}
