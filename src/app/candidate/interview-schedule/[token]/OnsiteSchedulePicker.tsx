"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { submitOnsiteAvailability } from "./actions";
import { Calendar, Clock, X, Loader2, CheckCircle, Plus } from "lucide-react";

// Available time slots
const TIME_SLOTS = [
  { id: "9:00 AM", label: "9:00 AM" },
  { id: "10:00 AM", label: "10:00 AM" },
  { id: "11:00 AM", label: "11:00 AM" },
  { id: "12:00 PM", label: "12:00 PM" },
  { id: "1:00 PM", label: "1:00 PM" },
  { id: "2:00 PM", label: "2:00 PM" },
  { id: "3:00 PM", label: "3:00 PM" },
  { id: "4:00 PM", label: "4:00 PM" },
  { id: "5:00 PM", label: "5:00 PM" },
];

interface SelectedSlot {
  date: Date;
  time: string;
}

interface OnsiteSchedulePickerProps {
  interviewToken: string;
}

export function OnsiteSchedulePicker({ interviewToken }: OnsiteSchedulePickerProps) {
  const router = useRouter();
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Generate next 14 days (2 weeks)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Skip Sundays (optional - adjust as needed)
      if (date.getDay() !== 0) {
        dates.push(date);
      }
    }
    return dates;
  }, []);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Format full date + time for display
  const formatSlot = (slot: SelectedSlot): string => {
    return `${formatDate(slot.date)} at ${slot.time}`;
  };

  // Check if a date+time combo is already selected
  const isSlotSelected = (date: Date, time: string): boolean => {
    return selectedSlots.some(
      (slot) => slot.date.getTime() === date.getTime() && slot.time === time
    );
  };

  // Add a time slot for the selected date
  const addTimeSlot = (time: string) => {
    if (!selectedDate) return;
    
    if (isSlotSelected(selectedDate, time)) {
      // Remove if already selected
      setSelectedSlots((prev) =>
        prev.filter(
          (slot) => !(slot.date.getTime() === selectedDate.getTime() && slot.time === time)
        )
      );
    } else {
      // Add new slot
      setSelectedSlots((prev) => [...prev, { date: selectedDate, time }]);
    }
  };

  // Remove a selected slot
  const removeSlot = (index: number) => {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit availability
  const handleSubmit = async () => {
    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Format slots as line-separated text
    const availability = selectedSlots
      .sort((a, b) => {
        // Sort by date first, then by time
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime();
        }
        return a.time.localeCompare(b.time);
      })
      .map((slot) => formatSlot(slot))
      .join("\n");

    const result = await submitOnsiteAvailability(interviewToken, availability);

    if (!result.success) {
      setError(result.error || "Failed to submit availability");
      setIsSubmitting(false);
      return;
    }

    setIsComplete(true);
  };

  // Show success screen
  if (isComplete) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">You&apos;re All Set!</h2>
        <p className="text-slate-400 mb-6">
          We&apos;ve received your availability. We&apos;ll be in touch soon to confirm your on-site interview time.
        </p>
        <div className="bg-slate-800/50 rounded-lg p-4 max-w-sm mx-auto">
          <p className="text-sm text-slate-500 mb-2">Your selected times:</p>
          <ul className="text-sm text-slate-300 space-y-1">
            {selectedSlots.map((slot, idx) => (
              <li key={idx}>{formatSlot(slot)}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Selected slots summary */}
      {selectedSlots.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Your Selected Times ({selectedSlots.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSlots.map((slot, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm text-emerald-300"
              >
                <span>{formatSlot(slot)}</span>
                <button
                  onClick={() => removeSlot(idx)}
                  className="hover:text-emerald-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date selection */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Select a Date
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {availableDates.map((date) => {
            const isSelected = selectedDate?.getTime() === date.getTime();
            const hasSlots = selectedSlots.some(
              (slot) => slot.date.getTime() === date.getTime()
            );
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  p-3 rounded-lg border-2 text-center transition-all
                  ${isSelected
                    ? "bg-blue-500/20 border-blue-500 text-blue-300"
                    : hasSlots
                    ? "bg-emerald-500/10 border-emerald-500/50 text-slate-300 hover:border-blue-400"
                    : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                  }
                `}
              >
                <div className="text-xs opacity-70">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="font-semibold">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                {hasSlots && (
                  <div className="mt-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time selection (shows when date is selected) */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Select Times for {formatDate(selectedDate)}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = isSlotSelected(selectedDate, slot.id);
              
              return (
                <button
                  key={slot.id}
                  onClick={() => addTimeSlot(slot.id)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all flex items-center justify-center gap-2
                    ${isSelected
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                    }
                  `}
                >
                  {isSelected ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4 opacity-50" />
                  )}
                  <span className="text-sm font-medium">{slot.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-4 border-t border-slate-700/50">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedSlots.length === 0}
          className={`
            w-full py-4 rounded-xl font-medium text-lg transition-all flex items-center justify-center gap-2
            ${selectedSlots.length === 0
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : isSubmitting
              ? "bg-emerald-600 text-white cursor-wait"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Availability ({selectedSlots.length} slot{selectedSlots.length !== 1 ? "s" : ""})
            </>
          )}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Select multiple times across different days to give us flexibility in scheduling.
        </p>
      </div>
    </div>
  );
}





