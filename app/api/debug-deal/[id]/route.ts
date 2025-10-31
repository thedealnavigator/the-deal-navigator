import { NextResponse } from 'next/server';
import { adminClient } from '../../../../lib/supabase/admin';

function extractIdFromPath(pathname: string) {
  // fallback if params is undefined
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function isUuid(v: string | null | undefined) {
  if (!v) return false;
  // basic UUID v4-ish check (accepts any UUID format)
  return /^[0-9a-fA-F-]{32,36}$/.test(v);
}

export async function GET(req: Request, ctx: { params?: { id?: string } }) {
  const pathname = new URL(req.url).pathname;
  const paramId = ctx?.params?.id;
  const fallbackId = extractIdFromPath(pathname);
  const id = paramId ?? fallbackId ?? null;

  // Report what we received
  const report = {
    pathname,
    paramId: paramId ?? null,
    fallbackId,
    id,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE,
  };

  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, reason: 'missing_or_invalid_id', report },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient
    .from('deals_enriched')
    .select('id,title,url_affiliate,published_at')
    .eq('id', id)
    .single();

  return NextResponse.json({ ok: true, report, data, error });
}
