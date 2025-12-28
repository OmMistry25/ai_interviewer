"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob, publishJob, deleteJob } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ArrowLeft, ExternalLink, Trash2, Globe, AlertCircle } from "lucide-react";

interface JobFormProps {
  templates: { id: string; name: string }[];
  job?: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    employment_type: string;
    hourly_rate_min?: number;
    hourly_rate_max?: number;
    template_id?: string;
    status: string;
  };
}

export function JobForm({ templates, job }: JobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!job;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateJob(job.id, formData)
      : await createJob(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/admin/jobs");
  }

  async function handlePublish() {
    if (!job) return;
    setLoading(true);
    const result = await publishJob(job.id);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!job || !confirm("Are you sure you want to delete this job?")) return;
    setLoading(true);
    const result = await deleteJob(job.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/admin/jobs");
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Input
        type="text"
        name="title"
        label="Job Title *"
        defaultValue={job?.title}
        required
        placeholder="e.g., Barista"
      />

      <Textarea
        name="description"
        label="Description"
        defaultValue={job?.description}
        rows={4}
        placeholder="Describe the role and responsibilities..."
      />

      <Input
        type="text"
        name="location"
        label="Location"
        defaultValue={job?.location}
        placeholder="e.g., San Francisco, CA"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          name="employment_type"
          label="Employment Type"
          defaultValue={job?.employment_type || "full_time"}
        >
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
        </Select>

        {isEditing && (
          <Select
            name="status"
            label="Status"
            defaultValue={job?.status}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          name="hourly_rate_min"
          label="Min Hourly Rate ($)"
          defaultValue={job?.hourly_rate_min}
          step="0.01"
          min="0"
          placeholder="15.00"
        />
        <Input
          type="number"
          name="hourly_rate_max"
          label="Max Hourly Rate ($)"
          defaultValue={job?.hourly_rate_max}
          step="0.01"
          min="0"
          placeholder="22.00"
        />
      </div>

      <div>
        <Select
          name="template_id"
          label="Interview Template"
          defaultValue={job?.template_id || ""}
        >
          <option value="">No interview template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-500 mt-2">
          Select which interview template to use for candidates applying to this job.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading}
          variant="primary"
          className="flex-1"
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Job"}
        </Button>

        {isEditing && job.status === "draft" && (
          <Button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            variant="secondary"
            icon={<Globe className="w-4 h-4" />}
          >
            Publish
          </Button>
        )}

        {isEditing && (
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        )}
      </div>

      {isEditing && job.status === "active" && (
        <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-sm text-slate-400 mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-emerald-500" />
            Public Application Page:
          </p>
          <code className="text-amber-400 text-sm">
            {typeof window !== "undefined" ? window.location.origin : ""}/apply/{job.id}
          </code>
        </div>
      )}

      <div className="pt-4 border-t border-slate-700/50">
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
      </div>
    </form>
  );
}
