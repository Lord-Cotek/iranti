import { devMailEnabled, env } from "./env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Local development only: the last few messages per address, never in a deployment.
const devInbox =
  (globalThis as unknown as { __irantiDevInbox?: Map<string, Mail[]> }).__irantiDevInbox ??
  new Map<string, Mail[]>();
(globalThis as unknown as { __irantiDevInbox?: Map<string, Mail[]> }).__irantiDevInbox = devInbox;

export function devMailbox(to: string): Mail[] {
  return devMailEnabled() ? (devInbox.get(to.toLowerCase()) ?? []) : [];
}

/**
 * Send an email through Resend. Message bodies may contain one-time codes, so neither the
 * message nor the provider's response body is ever logged.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (devMailEnabled()) {
    const list = devInbox.get(mail.to.toLowerCase()) ?? [];
    list.push(mail);
    devInbox.set(mail.to.toLowerCase(), list.slice(-5));
    return;
  }
  const e = env();
  if (!e.RESEND_API_KEY || !e.EMAIL_FROM) {
    console.error("mail: RESEND_API_KEY or EMAIL_FROM is not configured");
    throw new Error("Email is not configured");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: e.EMAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (!res.ok) {
    console.error(`mail: provider returned ${res.status}`);
    throw new Error("Email could not be sent");
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function otpMail(to: string, code: string): Mail {
  const text = [
    `Your Ìrántí sign-in code is ${code}.`,
    "",
    "It works once and expires in 10 minutes.",
    "If you didn't ask for it, you can ignore this email. Nobody can sign in without the code.",
    "",
    "Ìrántí will never ask you for your passphrase or recovery code by email.",
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#23211d">
<p>Your Ìrántí sign-in code is</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">${escapeHtml(code)}</p>
<p>It works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
<p style="color:#6e6a63">Ìrántí will never ask you for your passphrase or recovery code by email.</p>
</div>`;
  return { to, subject: `${code} is your Ìrántí code`, text, html };
}

export function securityNoticeMail(to: string, what: string): Mail {
  const text = `${what}\n\nIf this was you, there is nothing to do. If it wasn't, sign in and check your Ìrántí now.`;
  return {
    to,
    subject: "A change to your Ìrántí",
    text,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;color:#23211d"><p>${escapeHtml(what)}</p><p>If this was you, there is nothing to do. If it wasn't, sign in and check your Ìrántí now.</p></div>`,
  };
}
