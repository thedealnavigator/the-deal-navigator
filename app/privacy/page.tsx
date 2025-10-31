// =========================================
// NEW: app/privacy/page.tsx — stub (linkable for verification)
// =========================================
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy — The Deal Navigator' };
export default function PrivacyPage() {
return (
<div className="prose max-w-2xl mx-auto">
<h1>Privacy Policy</h1>
<p>This is a short placeholder. We collect email and optional phone number to deliver daily deal alerts.</p>
<p>We do not sell personal information. You can unsubscribe from email or SMS at any time.</p>
<p>Contact: <a href="mailto:support@thedealnavigator.com">support@thedealnavigator.com</a></p>
</div>
);
}