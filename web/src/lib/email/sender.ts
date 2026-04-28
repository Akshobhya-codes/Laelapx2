import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Server-only email sender backed by Gmail SMTP. Soft-fail by design — never
 * throws, so a transient SMTP issue can't break the user-facing action that
 * triggered the notification.
 *
 * Skips entirely when GMAIL_USER / GMAIL_APP_PASSWORD aren't set, so dev
 * environments without email creds still work.
 */
let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return _transporter;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, reason: "no-credentials" };

  try {
    await t.sendMail({
      from: `"Laelapx" <${process.env.GMAIL_USER}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    // Soft-fail. Log but don't propagate.
    console.error("[email] send failed:", err);
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
