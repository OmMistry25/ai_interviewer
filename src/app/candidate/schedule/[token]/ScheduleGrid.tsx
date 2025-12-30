"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitScheduleAvailability } from "./actions";
import { CheckCircle, Loader2 } from "lucide-react";

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

interface ScheduleGridProps {
  applicationId: string;
  interviewToken: string;
}

export function ScheduleGrid({ applicationId, interviewToken }: ScheduleGridProps) {
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });
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

  const toggleDay = (day: DayId) => {
    setAvailability((prev) => {
      const allShifts = SHIFTS.map((s) => s.id);
      const hasAll = allShifts.every((s) => prev[day].includes(s));
      return { ...prev, [day]: hasAll ? [] : allShifts };
    });
  };

  const toggleShiftAllDays = (shift: ShiftId) => {
    setAvailability((prev) => {
      const allDays = DAYS.map((d) => d.id);
      const hasShiftAllDays = allDays.every((d) => prev[d].includes(shift));
      
      const newAvailability = { ...prev };
      for (const day of allDays) {
        if (hasShiftAllDays) {
          newAvailability[day] = newAvailability[day].filter((s) => s !== shift);
        } else {
          if (!newAvailability[day].includes(shift)) {
            newAvailability[day] = [...newAvailability[day], shift];
          }
        }
      }
      return newAvailability;
    });
  };

  const totalSelected = Object.values(availability).reduce(
    (sum, shifts) => sum + shifts.length,
    0
  );

  const handleSubmit = async () => {
    if (totalSelected === 0) {
      setError("Please select at least one shift when you're available.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitScheduleAvailability(applicationId, availability);

    if (!result.success) {
      setError(result.error || "Failed to submit schedule");
      setIsSubmitting(false);
      return;
    }

    // Redirect to profile page
    router.push(`/candidate/profile/${interviewToken}`);
  };

  return (
    <div>
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
                <th key={day.id} className="p-1 text-center w-12">
                  <button
                    onClick={() => toggleDay(day.id)}
                    className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {day.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map((shift) => (
              <tr key={shift.id}>
                <td className="p-2">
                  <button
                    onClick={() => toggleShiftAllDays(shift.id)}
                    className="text-left"
                  >
                    <span className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                      {shift.label}
                    </span>
                    <span className="block text-xs text-slate-600">{shift.time}</span>
                  </button>
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
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            {totalSelected === 0 ? (
              "Select the shifts when you can work"
            ) : (
              <>
                <span className="text-emerald-400 font-medium">{totalSelected}</span> shift
                {totalSelected !== 1 ? "s" : ""} selected
              </>
            )}
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || totalSelected === 0}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit My Availability"
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center mt-3">
          You can update your availability later if needed.
        </p>
      </div>
    </div>
  );
}

