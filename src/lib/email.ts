import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "~/env";

/**
 * Returns a configured nodemailer transporter, or null if SMTP is not configured.
 */
function getTransporter() {
  if (!env.EMAIL_SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT ?? 587,
    secure: (env.EMAIL_SMTP_PORT ?? 587) === 465,
    auth: env.EMAIL_SMTP_USER
      ? { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS }
      : undefined,
  });
}

export function getEmailProvider() {
  if (env.EMAIL_PROVIDER === "resend")
    return env.RESEND_API_KEY && env.EMAIL_FROM ? "resend" : "unconfigured";
  if (env.EMAIL_PROVIDER === "auto" && env.RESEND_API_KEY && env.EMAIL_FROM)
    return "resend";
  return env.EMAIL_SMTP_HOST ? "smtp" : "unconfigured";
}

async function deliver(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const useResend = getEmailProvider() === "resend";
  const from = env.EMAIL_FROM ?? env.EMAIL_SMTP_USER;
  if (useResend) {
    if (!env.RESEND_API_KEY || !from) return false;
    const { error } = await new Resend(env.RESEND_API_KEY).emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) throw new Error(`Resend delivery failed: ${error.message}`);
    return true;
  }
  const transporter = getTransporter();
  if (!transporter) return false;
  await transporter.sendMail({
    from: from ?? "noreply@localhost",
    ...input,
  });
  return true;
}

export interface ContactNotificationData {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export async function sendAccountEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  return deliver(input);
}

export async function sendUserInvitation(input: {
  email: string;
  name: string;
  url: string;
  role: string;
}) {
  return sendAccountEmail({
    to: input.email,
    subject: "You’re invited to hadlockCMS",
    text: `Hi ${input.name},\n\nYou were invited as ${input.role}. Create your account here:\n${input.url}\n\nThis invitation expires in 72 hours.`,
    html: `<p>Hi ${escapeHtml(input.name)},</p><p>You were invited to hadlockCMS as <strong>${escapeHtml(input.role)}</strong>.</p><p><a href="${escapeHtml(input.url)}">Create your account</a></p><p>This invitation expires in 72 hours.</p>`,
  });
}

/**
 * Sends an email notification when a contact form is submitted.
 * Silently no-ops if no email provider is configured.
 */
export async function sendContactNotification(
  data: ContactNotificationData,
  recipient?: string | null,
) {
  const to = recipient ?? env.EMAIL_TO;
  if (!to) return;

  const subject = data.subject
    ? `New contact: ${data.subject}`
    : `New contact message from ${data.name}`;

  await deliver({
    to,
    subject,
    text: [
      `From: ${data.name} <${data.email}>`,
      data.subject ? `Subject: ${data.subject}` : null,
      "",
      data.message,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>
      ${data.subject ? `<p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>` : ""}
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
    `,
  });
}

export async function sendContactConfirmation(data: ContactNotificationData) {
  await deliver({
    to: data.email,
    subject: "We received your message",
    text: `Hi ${data.name},\n\nThanks for reaching out. We received your message and will respond as soon as possible.\n\n${data.message}`,
  });
}
