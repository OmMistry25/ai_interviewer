"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Cliq's organization email - used to filter job postings
const CLIQ_ORG_EMAIL = "simplaiapps@gmail.com";

// Cache the org ID to avoid repeated lookups
let cachedCliqOrgId: string | null = null;

async function getCliqOrgId(): Promise<string | null> {
  if (cachedCliqOrgId) {
    return cachedCliqOrgId;
  }
  
  const adminClient = createSupabaseAdminClient();
  
  // Find user by email using auth admin
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
  
  if (authError || !authData?.users) {
    console.error("[getCliqOrgId] Auth error:", authError);
    return null;
  }
  
  const cliqUser = authData.users.find(u => u.email === CLIQ_ORG_EMAIL);
  
  if (!cliqUser) {
    console.error("[getCliqOrgId] User not found:", CLIQ_ORG_EMAIL);
    return null;
  }
  
  // Get org membership for this user
  const { data: membership, error: memberError } = await adminClient
    .from("organization_members")
    .select("org_id")
    .eq("user_id", cliqUser.id)
    .single();
  
  if (memberError || !membership) {
    console.error("[getCliqOrgId] Membership error:", memberError);
    return null;
  }
  
  cachedCliqOrgId = membership.org_id;
  return cachedCliqOrgId;
}

export async function findJobByLocation(location: string): Promise<{ jobId: string | null }> {
  const adminClient = createSupabaseAdminClient();
  
  // Get Cliq's organization ID
  const cliqOrgId = await getCliqOrgId();
  
  if (!cliqOrgId) {
    console.error("[findJobByLocation] Could not find Cliq organization");
    return { jobId: null };
  }
  
  // Normalize the location for matching
  const normalizedLocation = location.toLowerCase().trim();
  
  // Search for active job postings that match the location (only from Cliq's org)
  // Exclude job postings with empty or null locations (those are general postings)
  const { data: jobs, error } = await adminClient
    .from("job_postings")
    .select("id, location, title")
    .eq("org_id", cliqOrgId)
    .eq("status", "active")
    .not("location", "is", null)
    .neq("location", "")
    .ilike("location", `%${normalizedLocation}%`)
    .limit(1);
  
  if (error) {
    console.error("[findJobByLocation] Error:", error);
  }
  
  if (jobs && jobs.length > 0) {
    console.log("[findJobByLocation] Found exact match:", jobs[0].title);
    return { jobId: jobs[0].id };
  }
  
  // No exact match found, try a broader search with location parts
  const locationParts = normalizedLocation.split(/[,\s]+/).filter(Boolean);
  
  for (const part of locationParts) {
    if (part.length < 3) continue; // Skip short parts like "IL", "CA"
    
    const { data: broadJobs } = await adminClient
      .from("job_postings")
      .select("id, location, title")
      .eq("org_id", cliqOrgId)
      .eq("status", "active")
      .not("location", "is", null)
      .neq("location", "")
      .ilike("location", `%${part}%`)
      .limit(1);
    
    if (broadJobs && broadJobs.length > 0) {
      console.log("[findJobByLocation] Found broad match:", broadJobs[0].title);
      return { jobId: broadJobs[0].id };
    }
  }
  
  // No location match found - fall back to "Barista - General" job posting
  const { data: generalJob } = await adminClient
    .from("job_postings")
    .select("id, title")
    .eq("org_id", cliqOrgId)
    .eq("status", "active")
    .ilike("title", "%General%")
    .limit(1);
  
  if (generalJob && generalJob.length > 0) {
    console.log("[findJobByLocation] Falling back to general job:", generalJob[0].title);
    return { jobId: generalJob[0].id };
  }
  
  // Last resort: find any job with empty/null location
  const { data: fallbackJob } = await adminClient
    .from("job_postings")
    .select("id, title, location")
    .eq("org_id", cliqOrgId)
    .eq("status", "active")
    .limit(10);
  
  // Find one with empty or null location
  const emptyLocationJob = fallbackJob?.find(j => !j.location || j.location.trim() === "");
  
  if (emptyLocationJob) {
    console.log("[findJobByLocation] Falling back to empty location job:", emptyLocationJob.title);
    return { jobId: emptyLocationJob.id };
  }
  
  console.log("[findJobByLocation] No matching job found");
  return { jobId: null };
}
