import { Resend } from "resend";

/** Sends an email. Returns false (and sends nothing) when Resend isn't configured. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("AUTH_RESEND_KEY not set, skipping email to", to, subject);
    return false;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "HomeHop <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return true;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
