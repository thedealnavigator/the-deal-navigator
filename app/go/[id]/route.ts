import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Look up affiliate URL from Supabase
  const { data: deal, error } = await adminClient
    .from('deals_enriched')
    .select('affiliate_url')
    .eq('id', id)
    .single();

  if (error || !deal?.affiliate_url) {
    return new NextResponse('Deal not found', { status: 404 });
  }

  // Optional: lightweight click logging (no req.ip in Next 16)
  const ipHeader = request.headers.get('x-forwarded-for') || '';
  const ip = ipHeader.split(',')[0] || null;
  const ua = request.headers.get('user-agent') || null;
  // Fire-and-forget; ignore errors
  // void adminClient.from('clicks').insert({ deal_id: id, ip, ua });

  return NextResponse.redirect(deal.affiliate_url, { status: 302 });
}
