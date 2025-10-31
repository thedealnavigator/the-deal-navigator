// app/api/cron/digest/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

function renderDigestHTML(
  deals: { id: string; title: string; description: string | null }[],
  unsubscribeUrl?: string
) {
  const items = deals
    .map(
      (d) => `
    <li style="margin-bottom:12px">
      <a href="${env.siteUrl}/deal/${d.id}" style="font-weight:600;text-decoration:none">${d.title}</a>
      ${d.description ? `<div style="color:#555">${d.description}</div>` : ''}
    </li>`
    )
    .join('');

  const unsub = unsubscribeUrl
    ? `<p style="font-size:12px;color:#666">Unsubscribe: <a href="${unsubscribeUrl}">one-click link</a></p>`
    : '';

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system">
    <h2 style="margin:0 0 12px">Today’s Top Deals</h2>
    <ul style="padding-left:16px">${items}</ul>
    ${unsub}
    <p style="font-size:12px;color:#666">You’re receiving this because you subscribed at ${env.siteUrl}.
    <br/>Reply STOP to opt out of SMS. For help, email support@thedealnavigator.com.</p>
  </div>`;
}

export async function GET() {
  const sb = supabaseAdmin();

  // Deals in the last 36h (covers late-night/early-morning publish)
  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const { data: deals, error: dealsErr } = await sb
    .from('deals')
    .select('id, title, description, published_at')
    .not('published_at', 'is', null)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(50);

  if (dealsErr) return NextResponse.json({ error: dealsErr.message }, { status: 500 });

  // Verified email subscribers; we use token to build one-click unsubscribe links
  const { data: subs, error: subsErr } = await sb
    .from('subscribers')
    .select('email, token')
    .eq('verified', true)
    .not('email', 'is', null)
    .limit(5000);

  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });

  if (!deals?.length || !subs?.length) {
    return NextResponse.json({ message: 'No recipients or no new deals.' });
  }

  let sent = 0;
  for (const s of subs) {
    try {
      const unsubscribeUrl = s.token ? `${env.siteUrl}/u/${s.token}` : undefined;
      const html = renderDigestHTML(deals, unsubscribeUrl);
      await sendEmail({ to: s.email as string, subject: 'Today’s Top Deals', html });
      sent++;
    } catch (e) {
      console.error('Email failed for', s.email, e);
    }
  }

  return NextResponse.json({ message: 'Digest sent', sent, dealCount: deals.length });
}
