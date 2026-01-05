import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Environment variables
// INTEGRATION_API_KEY: Secret key for authenticating Zapier requests
// YUMMY_FUTURE_TEMPLATE_ID: Template ID for Yummy Future barista interviews
//
// FUTURE: For multi-tenant support, accept templateId in the request body instead:
// {
//   "candidateName": "...",
//   "templateId": "uuid-here",  // Option C: Pass from Zapier
//   ...
// }

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.INTEGRATION_API_KEY;
    
    if (!expectedKey) {
      console.error("INTEGRATION_API_KEY not configured");
      return NextResponse.json(
        { error: "Integration not configured" },
        { status: 500 }
      );
    }
    
    if (apiKey !== expectedKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      candidateName, 
      candidatePhone, 
      candidateEmail,
      webhookUrl,
      // FUTURE: templateId - for multi-tenant support
    } = body;

    if (!candidateName) {
      return NextResponse.json(
        { error: "candidateName is required" },
        { status: 400 }
      );
    }

    // Get template ID from environment (Option B)
    // FUTURE: Use body.templateId if provided (Option C)
    const templateId = process.env.YUMMY_FUTURE_TEMPLATE_ID;
    
    if (!templateId) {
      console.error("YUMMY_FUTURE_TEMPLATE_ID not configured");
      return NextResponse.json(
        { error: "Template not configured" },
        { status: 500 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Get the published version of the template
    const { data: version, error: versionError } = await adminClient
      .from("interview_template_versions")
      .select("id, template_id")
      .eq("template_id", templateId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (versionError || !version) {
      console.error("Template version error:", versionError);
      return NextResponse.json(
        { error: "Template not found or not published" },
        { status: 400 }
      );
    }

    // Get org_id from the template
    const { data: template } = await adminClient
      .from("interview_templates")
      .select("org_id")
      .eq("id", templateId)
      .single();

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 400 }
      );
    }

    // Generate interview token
    const interviewToken = crypto.randomBytes(32).toString("hex");

    // Create interview record
    const { data: interview, error: interviewError } = await adminClient
      .from("interviews")
      .insert({
        org_id: template.org_id,
        template_version_id: version.id,
        candidate_name: candidateName,
        candidate_email: candidateEmail?.toLowerCase() || null,
        access_token: interviewToken,
        status: "scheduled",
        // Store additional data for webhook callback
        webhook_url: webhookUrl || null,
        candidate_phone: candidatePhone || null,
        source: "zapier", // Track where this interview came from
      })
      .select("id")
      .single();

    if (interviewError || !interview) {
      console.error("Interview creation error:", interviewError);
      return NextResponse.json(
        { error: "Failed to create interview" },
        { status: 500 }
      );
    }

    // Build interview URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usecliq.com";
    const interviewUrl = `${baseUrl}/candidate/interview/${interviewToken}`;

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      interviewUrl,
      message: "Interview created successfully",
    });

  } catch (error) {
    console.error("Create interview integration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

