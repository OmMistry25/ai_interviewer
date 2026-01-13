"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle, Loader2, Pencil, X } from "lucide-react";
import { updateScheduleAvailability } from "./actions";

const DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
] as const;

const SHIFTS = [
  { id: "morning", label: "Morning", time: "6am-10am" },
  { id: "afternoon", label: "Afternoon", time: "10am-2pm" },
  { id: "evening", label: "Evening", time: "2pm-6pm" },
  { id: "night", label: "Night", time: "6pm-10pm" },
] as const;

type DayId = typeof DAYS[number]["id"];
type ShiftId = typeof SHIFTS[number]["id"];
type Availability = Record<DayId, ShiftId[]>;

interface EditScheduleButtonProps {
  applicationId: string;
  interviewToken: string;
  currentAvailability: Record<string, string[]>;
}

export function EditScheduleButton({ applicationId, currentAvailability }: EditScheduleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availability, setAvailability] = useState<Availability>(() => ({
    monday: (currentAvailability.monday || []) as ShiftId[],
    tuesday: (currentAvailability.tuesday || []) as ShiftId[],
    wednesday: (currentAvailability.wednesday || []) as ShiftId[],
    thursday: (currentAvailability.thursday || []) as ShiftId[],
    friday: (currentAvailability.friday || []) as ShiftId[],
    saturday: (currentAvailability.saturday || []) as ShiftId[],
    sunday: (currentAvailability.sunday || []) as ShiftId[],
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleShift = (day: DayId, shift: ShiftId) => {
    setAvailability((prev) => {
      const dayShifts = prev[day];
      if (dayShifts.includes(shift)) {
        return { ...prev, [day]: dayShifts.filter((s) => s !== shift) };
      } else {
        return { ...prev, [day]: [...dayShifts, shift] };
      }
    });
  };

  const totalSelected = Object.values(availability).reduce(
    (sum, shifts) => sum + shifts.length,
    0
  );

  const handleSubmit = async () => {
    if (totalSelected === 0) {
      setError("Please select at least one shift.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await updateScheduleAvailability(applicationId, availability);

    if (!result.success) {
      setError(result.error || "Failed to update schedule");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsOpen(false);
    // Refresh page to show updated data
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Pencil className="w-4 h-4" />
        Edit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Edit Your Availability</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-slate-500 w-24"></th>
                  {DAYS.map((day) => (
                    <th key={day.id} className="p-1 text-center text-sm font-medium text-slate-300">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map((shift) => (
                  <tr key={shift.id}>
                    <td className="p-2">
                      <span className="text-sm font-medium text-slate-300">
                        {shift.label}
                      </span>
                      <span className="block text-xs text-slate-600">{shift.time}</span>
                    </td>
                    {DAYS.map((day) => {
                      const isSelected = availability[day.id].includes(shift.id);
                      return (
                        <td key={`${day.id}-${shift.id}`} className="p-1">
                          <button
                            onClick={() => toggleShift(day.id, shift.id)}
                            className={`
                              w-10 h-10 rounded-lg border-2 transition-all duration-200
                              flex items-center justify-center mx-auto
                              ${isSelected
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600 text-slate-600"
                              }
                            `}
                          >
                            {isSelected && <CheckCircle className="w-5 h-5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Submit */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <span className="text-emerald-400 font-medium">{totalSelected}</span> shift
              {totalSelected !== 1 ? "s" : ""} selected
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || totalSelected === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


