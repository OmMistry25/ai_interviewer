import { sendEmail } from "./resend";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Shared email styles
const styles = {
  container: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;",
  header: "background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;",
  body: "background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;",
  button: "display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;",
  footer: "text-align: center; color: #64748b; font-size: 12px; margin-top: 30px;",
};

/**
 * Send interview invitation with direct interview link
 */
export async function sendInterviewInviteEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  interviewUrl: string;
}) {
  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="margin: 0; font-size: 24px;">You're Invited to Interview!</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Thank you for your interest in the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.</p>
        <p>We'd love to learn more about you! Please complete a brief AI-powered video interview at your convenience.</p>
        <div style="text-align: center;">
          <a href="${params.interviewUrl}" style="${styles.button}">Start Interview</a>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Before you begin:</p>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Find a quiet, well-lit space</li>
            <li>Make sure your camera and microphone work</li>
            <li>The interview takes about 10-15 minutes</li>
            <li>You can use your phone or computer</li>
          </ul>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link is unique to you and can be used anytime.</p>
        <p>Best of luck!</p>
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Interview Invitation: ${params.jobTitle} at ${params.companyName}`,
    html,
  });
}

/**
 * Send application received confirmation (legacy - redirects to schedule)
 */
export async function sendApplicationReceivedEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  scheduleUrl: string;
}) {
  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="margin: 0; font-size: 24px;">Application Received!</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Thank you for applying for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.</p>
        <p>We've received your application and would like to invite you to complete a brief AI-powered video interview. This helps us learn more about you and your experience.</p>
        <div style="text-align: center;">
          <a href="${params.scheduleUrl}" style="${styles.button}">Schedule Your Interview</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">The interview takes about 10-15 minutes and can be completed on your phone or computer.</p>
        <p>Best of luck!</p>
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Your application for ${params.jobTitle} - Next Steps`,
    html,
  });
}

/**
 * Send interview scheduled confirmation
 */
export async function sendInterviewScheduledEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  scheduledTime: Date;
  interviewUrl: string;
}) {
  const formattedTime = params.scheduledTime.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="margin: 0; font-size: 24px;">Interview Scheduled!</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Your interview for the <strong>${params.jobTitle}</strong> position has been scheduled.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${formattedTime}</p>
        </div>
        <p><strong>Before your interview:</strong></p>
        <ul style="color: #475569;">
          <li>Find a quiet, well-lit space</li>
          <li>Test your camera and microphone</li>
          <li>Have a glass of water nearby</li>
        </ul>
        <div style="text-align: center;">
          <a href="${params.interviewUrl}" style="${styles.button}">Join Interview</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">You can join the interview up to 5 minutes early.</p>
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Interview Confirmed: ${params.jobTitle} - ${formattedTime}`,
    html,
  });
}

/**
 * Send interview reminder (1 hour before)
 */
export async function sendInterviewReminderEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  interviewUrl: string;
}) {
  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="margin: 0; font-size: 24px;">Interview Reminder</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Just a friendly reminder that your interview for the <strong>${params.jobTitle}</strong> position starts in 1 hour!</p>
        <div style="text-align: center;">
          <a href="${params.interviewUrl}" style="${styles.button}">Join Interview</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Make sure you're in a quiet place with good internet connection.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Reminder: Your interview starts in 1 hour`,
    html,
  });
}

/**
 * Send schedule reminder (for candidates who completed interview but haven't submitted availability)
 */
export async function sendScheduleReminderEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  scheduleUrl: string;
}) {
  const html = `
    <div style="${styles.container}">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Complete Your Application</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Great job completing your interview for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>!</p>
        <p>There's just one more step: <strong>let us know when you're available to work.</strong></p>
        <p style="color: #dc2626; font-weight: 500;">⚠️ Your application won't be submitted until you complete this step.</p>
        <div style="text-align: center;">
          <a href="${params.scheduleUrl}" style="${styles.button}; background: #f59e0b;">Submit My Schedule</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This only takes 1 minute — just check off the days and times you can work.</p>
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Action Required: Complete your ${params.jobTitle} application`,
    html,
  });
}

/**
 * Send profile link email after schedule submission
 */
export async function sendProfileLinkEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  profileUrl: string;
}) {
  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="margin: 0; font-size: 24px;">Application Submitted! 🎉</h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        <p>Great news! Your application for <strong>${params.jobTitle}</strong> at <strong>${params.companyName}</strong> has been submitted successfully.</p>
        <p>You can view your complete application profile at any time:</p>
        <div style="text-align: center;">
          <a href="${params.profileUrl}" style="${styles.button}">View My Profile</a>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">Your profile includes:</p>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Resume analysis results</li>
            <li>Interview transcript</li>
            <li>Performance scores</li>
            <li>Your availability schedule</li>
          </ul>
        </div>
        <p style="color: #64748b; font-size: 14px;">Save this email to access your profile anytime. We'll be in touch soon!</p>
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Application Submitted: ${params.jobTitle} at ${params.companyName}`,
    html,
  });
}

/**
 * Send decision notification
 */
export async function sendDecisionEmail(params: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  decision: "accepted" | "rejected";
  message?: string;
}) {
  const isAccepted = params.decision === "accepted";
  
  const html = `
    <div style="${styles.container}">
      <div style="${styles.header}; ${isAccepted ? '' : 'background: #64748b;'}">
        <h1 style="margin: 0; font-size: 24px;">
          ${isAccepted ? "Congratulations! 🎉" : "Application Update"}
        </h1>
      </div>
      <div style="${styles.body}">
        <p>Hi ${params.candidateName},</p>
        ${isAccepted ? `
          <p>We're excited to let you know that you've been selected to move forward for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>!</p>
          <p>A member of our team will reach out to you shortly to discuss next steps.</p>
        ` : `
          <p>Thank you for taking the time to interview for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.</p>
          <p>After careful consideration, we've decided to move forward with other candidates at this time.</p>
          <p>We appreciate your interest and wish you the best in your job search.</p>
        `}
        ${params.message ? `<p style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-style: italic;">"${params.message}"</p>` : ''}
        <p style="${styles.footer}">${params.companyName}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: isAccepted 
      ? `Great news about your ${params.jobTitle} application!`
      : `Update on your ${params.jobTitle} application`,
    html,
  });
}

