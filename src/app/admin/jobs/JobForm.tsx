"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob, publishJob, deleteJob } from "./actions";
import Link from "next/link";

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
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Job Title *
        </label>
        <input
          type="text"
          name="title"
          defaultValue={job?.title}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g., Barista"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={job?.description}
          rows={4}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Describe the role and responsibilities..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Location
        </label>
        <input
          type="text"
          name="location"
          defaultValue={job?.location}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g., San Francisco, CA"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Employment Type
          </label>
          <select
            name="employment_type"
            defaultValue={job?.employment_type || "full_time"}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Status
            </label>
            <select
              name="status"
              defaultValue={job?.status}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Min Hourly Rate ($)
          </label>
          <input
            type="number"
            name="hourly_rate_min"
            defaultValue={job?.hourly_rate_min}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="15.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Max Hourly Rate ($)
          </label>
          <input
            type="number"
            name="hourly_rate_max"
            defaultValue={job?.hourly_rate_max}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="22.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Interview Template
        </label>
        <select
          name="template_id"
          defaultValue={job?.template_id || ""}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">No interview template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          Select which interview template to use for candidates applying to this job.
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Job"}
        </button>

        {isEditing && job.status === "draft" && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            Publish
          </button>
        )}

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-700">
        <Link href="/admin/jobs" className="text-zinc-400 hover:text-white text-sm">
          ← Back to Jobs
        </Link>
      </div>
    </form>
  );
}

