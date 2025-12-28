"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTemplateVersion, publishTemplateVersion } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Save, Globe, CheckCircle, AlertCircle, Code } from "lucide-react";

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
    } catch {
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
    } catch {
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
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <Code className="w-4 h-4" />
          Template Configuration (JSON)
        </div>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-[500px] px-4 py-3 bg-slate-900/50 border border-slate-700/60 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          spellCheck={false}
        />
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={loading}
          variant="secondary"
          icon={<Save className="w-4 h-4" />}
        >
          {loading ? "Saving..." : "Save Draft"}
        </Button>

        <Button
          onClick={handlePublish}
          disabled={loading}
          variant="primary"
          icon={<Globe className="w-4 h-4" />}
        >
          {loading ? "Publishing..." : status === "published" ? "Update & Republish" : "Publish"}
        </Button>
      </div>

      <Card className="bg-slate-800/30">
        <h3 className="font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-slate-500" />
          Template JSON Structure
        </h3>
        <pre className="text-xs text-slate-500 overflow-x-auto bg-slate-900/50 p-4 rounded-lg">
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
      </Card>
    </div>
  );
}
