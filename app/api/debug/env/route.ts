import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const lookback = process.env.PUBLISH_LOOKBACK_HOURS;
  const topPer = process.env.PUBLISH_TOP_PER_CATEGORY;
  const cap = process.env.PUBLISH_DAILY_CAP;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anon,
    SUPABASE_SERVICE_ROLE_KEY: !!service,
    PUBLISH_LOOKBACK_HOURS: lookback ?? 'default (24)',
    PUBLISH_TOP_PER_CATEGORY: topPer ?? 'default (5)',
    PUBLISH_DAILY_CAP: cap ?? 'default (60)',
    note:
      'All true = ✅ Environment loaded correctly. Service key is not exposed in the response; only presence is checked.',
  });
}
