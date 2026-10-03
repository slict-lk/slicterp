import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// The main verified domain for the system
const DEFAULT_SYSTEM_DOMAIN = process.env.SYSTEM_EMAIL_DOMAIN || "demo.slict.com";

/**
 * Generates a professional "From" address based on tenant settings.
 * Format: "Company Name <quotes@domain.com>"
 */
async function getFromAddress(tenantId?: string) {
    if (!tenantId) return `Slict Auto <quotes@${DEFAULT_SYSTEM_DOMAIN}>`;

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { companyName: true, name: true, domain: true }
    });

    if (!tenant) return `Slict Auto <quotes@${DEFAULT_SYSTEM_DOMAIN}>`;

    const displayName = tenant.companyName || tenant.name;

    // Logic: Use tenant's custom domain if they have one, otherwise use system default
    // IMPORTANT: Custom domains must be verified in Resend dashboard first
    const domain = tenant.domain || DEFAULT_SYSTEM_DOMAIN;

    return `${displayName} <quotes@${domain}>`;
}

export async function sendQuoteConfirmation(to: string, data: any, tenantId?: string) {
    if (!process.env.RESEND_API_KEY || !resend) {
        console.warn("Resend not configured, skipping email");
        return;
    }

    const { name, vehicle, country, port, totalCIF } = data;
    const fromAddress = await getFromAddress(tenantId);

    const subject = `Quote Request Received: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    const html = `
    <h1>Hello ${name},</h1>
    <p>Thank you for requesting a quote for the <strong>${vehicle.year} ${vehicle.make} ${vehicle.model}</strong> (Stock: ${vehicle.stockNumber}).</p>
    
    <h3>Shipping Details</h3>
    <ul>
      <li><strong>Destination:</strong> ${port.name}, ${country.name}</li>
      <li><strong>Estimated CIF:</strong> ${totalCIF ? `$${totalCIF.toLocaleString()}` : 'Price on Request'}</li>
    </ul>

    <p>Our team will review the shipping costs and send you an official proforma invoice shortly.</p>
    
    <p>Best regards,<br/>Sales Team</p>
  `;

    try {
        const { data: resendData, error } = await resend.emails.send({
            from: fromAddress,
            to: [to],
            subject,
            html,
        });

        if (error) console.error("Resend Error:", error);
        else console.log("Quote Confirmation Sent:", resendData?.id);
    } catch (err) {
        console.error("Email Send Failed:", err);
    }
}

export async function sendQuotation(to: string, data: any, tenantId?: string) {
    if (!process.env.RESEND_API_KEY || !resend) return;

    const { name, vehicle, quoteLink } = data;
    const fromAddress = await getFromAddress(tenantId);

    const html = `
    <h1>Good News, ${name}!</h1>
    <p>Your quotation for the <strong>${vehicle.year} ${vehicle.make} ${vehicle.model}</strong> is ready.</p>
    
    <p>Please click the link below to view your official quote and proceed with the purchase.</p>
    
    <a href="${quoteLink}" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Quote</a>
    
    <p>If you have any questions, simply reply to this email.</p>
  `;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: [to],
            subject: `Your Quotation is Ready - ${vehicle.stockNumber}`,
            html,
        });
    } catch (err) {
        console.error("Email Send Failed:", err);
    }
}

// ─── Trial Email Templates ───────────────────────────────────────────────────

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#18181b;margin:0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">SLICT</span> ERP
      </h1>
    </div>
    <!-- Body -->
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#71717a;font-size:12px;">
      <p>© ${new Date().getFullYear()} SLICT ERP. All rights reserved.</p>
      <p>Need help? <a href="mailto:support@slict.lk" style="color:#3b82f6;">Contact Support</a></p>
    </div>
  </div>
</body>
</html>`;

const ctaButton = (text: string, url: string, color = '#3b82f6') => `
<div style="text-align:center;margin:24px 0;">
  <a href="${url}" style="display:inline-block;padding:12px 32px;background:${color};color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
    ${text}
  </a>
</div>`;

/**
 * Welcome Email — sent immediately after registration
 */
export async function sendWelcomeEmail(to: string, data: {
    name: string;
    companyName: string;
    trialEnd: Date;
    selectedApps: string[];
    loginUrl: string;
}) {
    if (!process.env.RESEND_API_KEY || !resend) {
        console.warn("Resend not configured, skipping welcome email");
        return;
    }

    const { name, companyName, trialEnd, selectedApps, loginUrl } = data;
    const formattedDate = trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const appsHtml = selectedApps
        .map(app => `<li style="padding:4px 0;color:#374151;">${app}</li>`)
        .join('');

    const html = emailWrapper(`
      <h2 style="font-size:20px;color:#18181b;margin:0 0 8px;">Welcome to SLICT ERP, ${name}! 🎉</h2>
      <p style="color:#52525b;line-height:1.6;">
        Your 14-day free trial for <strong>${companyName}</strong> is now active. Here's what you've selected:
      </p>

      <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-weight:600;color:#1e40af;margin:0 0 8px;">Your Selected Apps:</p>
        <ul style="margin:0;padding-left:20px;">${appsHtml}</ul>
      </div>

      <p style="color:#52525b;line-height:1.6;">
        Your trial runs until <strong>${formattedDate}</strong>. You have full access to all features in your selected apps.
      </p>

      ${ctaButton('Sign In to Your Dashboard', loginUrl)}

      <div style="border-top:1px solid #e4e4e7;margin-top:24px;padding-top:16px;">
        <p style="font-size:13px;color:#71717a;margin:0;">
          <strong>Quick Tips:</strong><br/>
          • Invite your team from Settings → Users<br/>
          • Explore each module from the sidebar<br/>
          • Need help? Our AI assistant is built right in
        </p>
      </div>
    `);

    try {
        const fromAddress = `SLICT ERP <noreply@${DEFAULT_SYSTEM_DOMAIN}>`;
        await resend.emails.send({ from: fromAddress, to: [to], subject: `Welcome to SLICT ERP — Your 14-Day Trial Has Started`, html });
        console.log("Welcome email sent to:", to);
    } catch (err) {
        console.error("Welcome email failed:", err);
    }
}

/**
 * Trial Expiring Email — sent 3 days before expiry
 */
export async function sendTrialExpiringEmail(to: string, data: {
    name: string;
    companyName: string;
    trialEnd: Date;
    daysLeft: number;
}) {
    if (!process.env.RESEND_API_KEY || !resend) return;

    const { name, daysLeft } = data;
    const upgradeUrl = `${BASE_URL}/settings/billing?plan=starter&utm_source=trial_email&utm_campaign=expiring_${daysLeft}d`;

    const html = emailWrapper(`
      <h2 style="font-size:20px;color:#18181b;margin:0 0 8px;">Your Trial Ends in ${daysLeft} Days ⏰</h2>
      <p style="color:#52525b;line-height:1.6;">
        Hi ${name}, your SLICT ERP free trial is coming to an end. Don't lose access to:
      </p>

      <ul style="color:#374151;line-height:1.8;">
        <li>📊 All your dashboard data and analytics</li>
        <li>👥 Team members and permissions</li>
        <li>📁 Documents, invoices, and records</li>
        <li>🤖 AI-powered automation workflows</li>
      </ul>

      ${ctaButton('Upgrade Now — Keep Everything', upgradeUrl)}

      <p style="color:#71717a;font-size:13px;text-align:center;">
        Need a custom plan? <a href="${BASE_URL}/contact" style="color:#3b82f6;">Contact our sales team</a>
      </p>
    `);

    try {
        const fromAddress = `SLICT ERP <noreply@${DEFAULT_SYSTEM_DOMAIN}>`;
        await resend.emails.send({ from: fromAddress, to: [to], subject: `⏰ Your SLICT ERP trial ends in ${daysLeft} days`, html });
    } catch (err) {
        console.error("Trial expiring email failed:", err);
    }
}

/**
 * Trial Urgent Email — sent 1 day before expiry
 */
export async function sendTrialUrgentEmail(to: string, data: {
    name: string;
    companyName: string;
    trialEnd: Date;
}) {
    if (!process.env.RESEND_API_KEY || !resend) return;

    const { name } = data;
    const upgradeUrl = `${BASE_URL}/settings/billing?plan=starter&utm_source=trial_email&utm_campaign=expiring_1d`;

    const html = emailWrapper(`
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="color:#991b1b;font-weight:600;margin:0;">⚠️ Last Day — Your trial expires tomorrow</p>
      </div>

      <p style="color:#52525b;line-height:1.6;">
        Hi ${name}, this is your final reminder. After tomorrow, your access to SLICT ERP will be paused.
      </p>

      <p style="color:#52525b;line-height:1.6;">
        <strong>Your data is safe</strong> — we keep it for 30 days after expiry. Upgrade anytime to restore full access instantly.
      </p>

      ${ctaButton('Upgrade Now — Last Chance', upgradeUrl, '#dc2626')}

      <p style="color:#71717a;font-size:13px;text-align:center;">
        Questions? Reply to this email or <a href="${BASE_URL}/contact" style="color:#3b82f6;">contact sales</a>
      </p>
    `);

    try {
        const fromAddress = `SLICT ERP <noreply@${DEFAULT_SYSTEM_DOMAIN}>`;
        await resend.emails.send({ from: fromAddress, to: [to], subject: `⚠️ Last day of your SLICT ERP trial`, html });
    } catch (err) {
        console.error("Trial urgent email failed:", err);
    }
}

/**
 * Trial Expired Email — sent when trial has ended
 */
export async function sendTrialExpiredEmail(to: string, data: {
    name: string;
    companyName: string;
}) {
    if (!process.env.RESEND_API_KEY || !resend) return;

    const { name, companyName } = data;
    const upgradeUrl = `${BASE_URL}/settings/billing?plan=starter&utm_source=trial_email&utm_campaign=expired`;

    const html = emailWrapper(`
      <h2 style="font-size:20px;color:#18181b;margin:0 0 8px;">Your Free Trial Has Ended</h2>
      <p style="color:#52525b;line-height:1.6;">
        Hi ${name}, the 14-day free trial for <strong>${companyName}</strong> has expired. Your account is currently paused.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#92400e;margin:0;font-size:13px;">
          <strong>📦 Data Retention:</strong> Your data is securely stored for 30 days. Subscribe before then to restore everything instantly.
        </p>
      </div>

      <p style="color:#52525b;line-height:1.6;font-weight:600;">
        Choose a plan to continue:
      </p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;text-align:center;">
            <p style="font-weight:700;color:#18181b;margin:0;">Starter</p>
            <p style="color:#3b82f6;font-size:20px;font-weight:700;margin:4px 0;">$29/mo</p>
            <p style="color:#71717a;font-size:12px;margin:0;">Up to 5 users</p>
          </td>
          <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;text-align:center;background:#f0f9ff;">
            <p style="font-weight:700;color:#18181b;margin:0;">Professional</p>
            <p style="color:#3b82f6;font-size:20px;font-weight:700;margin:4px 0;">$79/mo</p>
            <p style="color:#71717a;font-size:12px;margin:0;">Up to 25 users</p>
          </td>
          <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;text-align:center;">
            <p style="font-weight:700;color:#18181b;margin:0;">Enterprise</p>
            <p style="color:#3b82f6;font-size:20px;font-weight:700;margin:4px 0;">Custom</p>
            <p style="color:#71717a;font-size:12px;margin:0;">Unlimited</p>
          </td>
        </tr>
      </table>

      ${ctaButton('Subscribe Now', upgradeUrl, '#16a34a')}

      <p style="color:#71717a;font-size:13px;text-align:center;">
        Need a demo? <a href="${BASE_URL}/contact" style="color:#3b82f6;">Schedule a call with our team</a>
      </p>
    `);

    try {
        const fromAddress = `SLICT ERP <noreply@${DEFAULT_SYSTEM_DOMAIN}>`;
        await resend.emails.send({ from: fromAddress, to: [to], subject: `Your SLICT ERP trial has ended — Subscribe to continue`, html });
    } catch (err) {
        console.error("Trial expired email failed:", err);
    }
}
