"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { findJobByLocation } from "./actions";

export function LocationForm() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setError("Please enter your location");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await findJobByLocation(location.trim());
      
      if (result.jobId) {
        // Found a job matching the location
        router.push(`/apply/${result.jobId}?location=${encodeURIComponent(location.trim())}`);
      } else {
        // No matching job, redirect to general application
        router.push(`/apply/general?location=${encodeURIComponent(location.trim())}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <MapPin className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setError("");
          }}
          placeholder="Enter your city (e.g., Champaign, IL)"
          className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          disabled={isLoading}
        />
      </div>
      
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      
      <Button 
        type="submit" 
        variant="primary" 
        size="lg" 
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Finding jobs...</span>
          </>
        ) : (
          <>
            <span>Find Jobs Near Me</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>
    </form>
  );
}

