import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usecliq.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

async function main() {
  console.log("Fetching applications with completed interviews and schedules...");

  const { data: applications, error } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      schedule_availability,
      candidates (first_name, email),
      job_postings (title, organizations (name)),
      interviews (access_token)
    `)
    .eq("status", "interviewed")
    .not("schedule_availability", "is", null);

  if (error) {
    console.error("Error fetching applications:", error);
    return;
  }

  console.log(`Found ${applications?.length || 0} applications to email`);

  for (const app of applications || []) {
    const candidate = app.candidates as unknown as { first_name: string; email: string };
    const job = app.job_postings as unknown as { title: string; organizations: { name: string } };
    const interviews = app.interviews as unknown as Array<{ access_token: string }>;
    const interview = interviews?.[0];

    if (!candidate?.email || !interview?.access_token) {
      console.log(`Skipping application ${app.id} - missing email or token`);
      continue;
    }

    const profileUrl = `${baseUrl}/candidate/profile/${interview.access_token}`;
    
    console.log(`Sending email to ${candidate.email}...`);

    try {
      await resend.emails.send({
        from: "Cliq <noreply@usecliq.com>",
        to: candidate.email,
        subject: `Your Application Profile: ${job?.title || "Position"} at ${job?.organizations?.name || "Company"}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Your Application Profile</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
              <p>Hi ${candidate.first_name},</p>
              <p>You can now view your complete application profile for <strong>${job?.title || "Position"}</strong> at <strong>${job?.organizations?.name || "Company"}</strong>.</p>
              <div style="text-align: center;">
                <a href="${profileUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">View My Profile</a>
              </div>
              <p style="color: #64748b; font-size: 14px;">Your profile includes your resume analysis, interview scores, transcript, and schedule.</p>
              <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 30px;">${job?.organizations?.name || "Company"}</p>
            </div>
          </div>
        `,
      });
      console.log(`✓ Sent to ${candidate.email}`);
    } catch (e) {
      console.error(`✗ Failed to send to ${candidate.email}:`, e);
    }
  }

  console.log("Done!");
}

main();


