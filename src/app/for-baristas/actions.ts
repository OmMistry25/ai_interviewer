"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function findJobByLocation(location: string): Promise<{ jobId: string | null }> {
  const adminClient = createSupabaseAdminClient();
  
  // Normalize the location for matching
  const normalizedLocation = location.toLowerCase().trim();
  
  // Search for active job postings that match the location
  // Using case-insensitive search with ILIKE pattern
  const { data: jobs, error } = await adminClient
    .from("job_postings")
    .select("id, location")
    .eq("status", "active")
    .ilike("location", `%${normalizedLocation}%`)
    .limit(1);
  
  if (error) {
    console.error("[findJobByLocation] Error:", error);
    return { jobId: null };
  }
  
  if (jobs && jobs.length > 0) {
    return { jobId: jobs[0].id };
  }
  
  // No exact match found, try a broader search
  // Split location into parts (city, state, etc.) and search each
  const locationParts = normalizedLocation.split(/[,\s]+/).filter(Boolean);
  
  for (const part of locationParts) {
    if (part.length < 3) continue; // Skip short parts like "IL", "CA"
    
    const { data: broadJobs } = await adminClient
      .from("job_postings")
      .select("id, location")
      .eq("status", "active")
      .ilike("location", `%${part}%`)
      .limit(1);
    
    if (broadJobs && broadJobs.length > 0) {
      return { jobId: broadJobs[0].id };
    }
  }
  
  // No matching job found
  return { jobId: null };
}

