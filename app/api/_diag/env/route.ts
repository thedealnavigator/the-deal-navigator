// @ts-nocheck
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasUrl   = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon  = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSrv   = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // DO NOT print the values; just booleans
  return new Response(JSON.stringify({
    runtime: 'nodejs',
    hasEnv: { NEXT_PUBLIC_SUPABASE_URL: hasUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnon, SUPABASE_SERVICE_ROLE_KEY: hasSrv }
  }, null, 2), { headers: { 'content-type': 'application/json' }});
}
