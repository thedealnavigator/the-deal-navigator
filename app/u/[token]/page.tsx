// =========================================
// NEW: app/u/[token]/page.tsx — one-click unsubscribe
// =========================================
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';


export const runtime = 'nodejs';


export default async function UnsubscribePage({ params }: { params: { token: string } }) {
const sb = supabaseAdmin();
const token = params.token;
let message = 'You have been unsubscribed.';
try {
// Remove subscriber by token; if you prefer to keep a record, set verified=false instead.
const { error } = await sb.from('subscribers').delete().eq('token', token);
if (error) throw error;
} catch (e) {
console.error('Unsubscribe failed', e);
message = 'Invalid or expired link.';
}
return (
<div className="max-w-lg mx-auto text-center space-y-4">
<h1 className="text-2xl font-bold">Unsubscribe</h1>
<p>{message}</p>
<Link className="inline-block px-4 py-2 rounded-xl bg-black text-white" href="/">Return to homepage</Link>
</div>
);
}