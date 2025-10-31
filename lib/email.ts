// lib/email.ts
export async function sendEmail({
  to, subject, html, text,
}: { to: string; subject: string; html: string; text?: string }) {
  if (!process.env.RESEND_API_KEY || process.env.NODE_ENV !== 'production') {
    console.log('[DEV MAIL]', { to, subject, preview: html.slice(0, 200) + '...' });
    return { id: 'dev-mail' } as const;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'The Deal Navigator <noreply@thedealnavigator.com>',
      to, subject, html, text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  return res.json();
}