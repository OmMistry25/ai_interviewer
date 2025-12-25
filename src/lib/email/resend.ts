import { Resend } from "resend";
import { env } from "@/lib/env";

// Initialize Resend client (optional - gracefully handle if not configured)
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Use Resend's test address for development, or set your verified domain
const FROM_EMAIL = process.env.EMAIL_FROM || "Barista Hiring <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping email:", options.subject);
    console.log("[Email] Would send to:", options.to);
    return { success: true }; // Don't fail if email not configured
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("[Email] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("[Email] Exception:", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}

