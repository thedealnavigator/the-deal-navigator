// app/go/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
// From app/go/[id]/route.ts to lib/supabase/admin.ts is three levels up:
import { adminClient } from '../../../lib/supabase/admin';

function extractIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function isUuid(v: string | null | undefined) {
  if (!v) return false;
  return /^[0-9a-fA-F-]{32,36}$/.test(v);
}

export async function GET(req: NextRequest, ctx: { params?: { id?: string } }) {
  // Be defensive: Next.js sometimes doesn’t populate ctx.params in some edge cases
  const pathname = req.nextUrl.pathname;
  const paramId = ctx?.params?.id;
  const fallbackId = extractIdFromPath(pathname);
  const id = paramId ?? fallbackId ?? null;

  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Missing or invalid deal id' }, { status: 400 });
  }

  // Look up the affiliate URL for this deal (service role; bypasses RLS)
  const { data: deal, error } = await adminClient
    .from('deals_enriched')
    .select('id, url_affiliate')
    .eq('id', id)
    .single();

  if (error || !deal?.url_affiliate) {
    return NextResponse.json({ error: 'Deal not found or missing affiliate URL' }, { status: 404 });
  }

  const url = new URL(deal.url_affiliate);

  // Merge UTM tags (set defaults only if absent)
  const search = req.nextUrl.searchParams;
  const utm_source = search.get('utm_source') ?? 'the-deal-navigator';
  const utm_medium = search.get('utm_medium') ?? 'site';
  const utm_campaign = search.get('utm_campaign') ?? 'deal_click';
  const utm_term = search.get('utm_term') ?? undefined;
  const utm_content = search.get('utm_content') ?? undefined;

  const utms: Record<string, string | undefined> = {
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  };
  Object.entries(utms).forEach(([k, v]) => {
    if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
  });

  // Gather click metadata
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  const referer = req.headers.get('referer') ?? null;

  // Log click (don’t block redirect)
  adminClient.from('click_logs').insert({
    deal_id: id,
    ip,
    user_agent: userAgent,
    referer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content
  }).then().catch(() => { /* ignore logging errors */ });

  // Redirect to affiliate link
  return NextResponse.redirect(url.toString(), { status: 302 });
}
