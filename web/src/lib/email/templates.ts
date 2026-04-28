import "server-only";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://app.laelapx.com"
    : "http://localhost:3000");

/* ─── BRANDED SHELL ───────────────────────────────────────────────────── */
function shell(opts: {
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Laelapx</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f5f0;font-family:Inter,Arial,sans-serif;color:#191714;-webkit-font-smoothing:antialiased;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${opts.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid rgba(25,23,20,0.08);">
            <tr>
              <td style="background:#1c2b42;padding:22px 28px;color:#fff;">
                <div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;">Laelapx<span style="color:#4a78cc;">.</span></div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 28px;">
                ${opts.bodyHtml}
                ${
                  opts.ctaHref && opts.ctaLabel
                    ? `<div style="margin-top:32px;">
                        <a href="${opts.ctaHref}" style="display:inline-block;background:#1c2b42;color:#fff;padding:13px 26px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:700;">${opts.ctaLabel} →</a>
                      </div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="background:#edeae3;padding:18px 28px;border-top:1px solid rgba(25,23,20,0.08);">
                <div style="font-size:11px;color:#9a968e;letter-spacing:0.05em;">Sent by Laelapx · You can mute these in your account settings.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* ─── TEMPLATES ───────────────────────────────────────────────────────── */
export function connectRequestedEmail(input: {
  founderFirstName: string;
  fundName: string;
  startupName: string;
  startupSlug: string;
  message: string | null;
}) {
  const subject = `${input.fundName} wants to connect with ${input.startupName}`;
  const messageBlock = input.message
    ? `<div style="margin-top:18px;padding:16px;background:#f7f5f0;border-radius:8px;border-left:3px solid #2c5ba8;font-size:14px;line-height:1.5;color:#5a5650;font-style:italic;">"${escapeHtml(input.message)}"</div>`
    : "";
  return {
    subject,
    html: shell({
      preheader: subject,
      bodyHtml: `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#2c5ba8;margin-bottom:10px;">Incoming connect</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.025em;line-height:1.2;color:#1c2b42;">
          ${escapeHtml(input.fundName)} wants to connect with ${escapeHtml(input.startupName)}.
        </div>
        <p style="margin-top:14px;font-size:15px;line-height:1.6;color:#5a5650;">
          Hey ${escapeHtml(input.founderFirstName)} — an investor on Laelapx just sent a connect request. Their thesis is attached on the platform; accept to start a conversation.
        </p>
        ${messageBlock}
      `,
      ctaLabel: "Open in Laelapx",
      ctaHref: `${APP_URL}/founder/${input.startupSlug}`,
    }),
  };
}

export function connectAcceptedEmail(input: {
  investorFirstName: string;
  startupName: string;
  conversationId: string;
}) {
  const subject = `${input.startupName} accepted your connect`;
  return {
    subject,
    html: shell({
      preheader: subject,
      bodyHtml: `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#2a9c52;margin-bottom:10px;">Connect accepted</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.025em;line-height:1.2;color:#1c2b42;">
          ${escapeHtml(input.startupName)} accepted your connect request.
        </div>
        <p style="margin-top:14px;font-size:15px;line-height:1.6;color:#5a5650;">
          Hey ${escapeHtml(input.investorFirstName)} — your conversation is open. Both sides see new messages live.
        </p>
      `,
      ctaLabel: "Open thread",
      ctaHref: `${APP_URL}/messages/${input.conversationId}`,
    }),
  };
}

export function messageReceivedEmail(input: {
  recipientFirstName: string;
  fromName: string;
  preview: string;
  conversationId: string;
}) {
  const subject = `${input.fromName}: new message`;
  return {
    subject,
    html: shell({
      preheader: input.preview,
      bodyHtml: `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#2c5ba8;margin-bottom:10px;">New message</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.025em;line-height:1.2;color:#1c2b42;">
          ${escapeHtml(input.fromName)} sent you a message.
        </div>
        <div style="margin-top:18px;padding:16px;background:#f7f5f0;border-radius:8px;border-left:3px solid #2c5ba8;font-size:14px;line-height:1.5;color:#5a5650;font-style:italic;">"${escapeHtml(input.preview)}"</div>
        <p style="margin-top:14px;font-size:13px;line-height:1.5;color:#9a968e;">Hey ${escapeHtml(input.recipientFirstName)} — reply on Laelapx.</p>
      `,
      ctaLabel: "Reply",
      ctaHref: `${APP_URL}/messages/${input.conversationId}`,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
