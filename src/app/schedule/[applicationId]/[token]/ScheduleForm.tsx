"use client";

import { useState } from "react";
import { scheduleInterview } from "./actions";
import { CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ScheduleFormProps {
  applicationId: string;
  token: string;
  jobId: string;
  templateId: string | null;
}

export function ScheduleForm({ applicationId, token, jobId, templateId }: ScheduleFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [interviewUrl, setInterviewUrl] = useState<string | null>(null);

  // Generate time slots (every 30 minutes from 8am to 8pm)
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (const min of [0, 30]) {
      if (hour === 20 && min === 30) continue;
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const label = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      timeSlots.push({ value: time, label });
    }
  }

  // Get next 14 days
  const availableDates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    availableDates.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      setError("Please select both a date and time");
      return;
    }

    setLoading(true);
    setError(null);

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);

    const result = await scheduleInterview({
      applicationId,
      token,
      jobId,
      templateId,
      scheduledAt: scheduledAt.toISOString(),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setInterviewUrl(result.interviewUrl || null);
    setLoading(false);
  }

  if (interviewUrl) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Interview Scheduled!</h2>
        <p className="text-slate-400 mb-6">
          Your interview is scheduled for{" "}
          <span className="text-slate-100 font-medium">
            {new Date(`${selectedDate}T${selectedTime}`).toLocaleString()}
          </span>
        </p>
        
        <div className="space-y-4">
          <a
            href={interviewUrl}
            className="block w-full py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors text-center"
          >
            Start Interview Now
          </a>
          <p className="text-slate-500 text-sm">
            Or wait for the scheduled time. We&apos;ll send you an email reminder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
          <Calendar className="w-4 h-4" />
          Select a Date
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableDates.map((date) => (
            <button
              key={date.value}
              type="button"
              onClick={() => setSelectedDate(date.value)}
              className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedDate === date.value
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600"
              }`}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select a Time
          </label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => setSelectedTime(slot.value)}
                className={`p-2 rounded-lg text-sm transition-all duration-200 ${
                  selectedTime === slot.value
                    ? "bg-amber-500 text-slate-900 font-medium"
                    : "bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !selectedDate || !selectedTime}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {loading ? "Scheduling..." : "Confirm & Schedule"}
      </Button>
    </form>
  );
}
