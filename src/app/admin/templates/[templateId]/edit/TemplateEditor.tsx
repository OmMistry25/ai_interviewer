"use client";

import { useState } from "react";
import { updateTemplateVersion, publishTemplateVersion } from "../../actions";

interface TemplateEditorProps {
  versionId: string;
  config: unknown;
  isPublished: boolean;
}

export function TemplateEditor({
  versionId,
  config,
  isPublished,
}: TemplateEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const parsed = JSON.parse(jsonText);
      await updateTemplateVersion(versionId, parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setError(null);
    setPublishing(true);

    try {
      await publishTemplateVersion(versionId);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        disabled={isPublished}
        className="w-full h-96 p-4 rounded bg-zinc-800 text-white font-mono text-sm border border-zinc-700 disabled:opacity-50"
      />

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-2">
        {!isPublished && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-6 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </>
        )}
        {isPublished && (
          <p className="text-zinc-500">
            This version is published and cannot be edited.
          </p>
        )}
      </div>
    </div>
  );
}

