"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplate } from "../actions";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, FileText, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/templates" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Create Template</h1>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              label="Template Name"
              required
              placeholder="e.g., Barista Interview"
            />

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              variant="primary"
              className="w-full"
            >
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
