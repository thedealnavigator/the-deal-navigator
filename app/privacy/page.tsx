// =========================================
// NEW: app/privacy/page.tsx — stub (linkable for verification)
// =========================================
export function metadata() { return { title: 'Privacy Policy — The Deal Navigator' }; }
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

// =========================================
// NOTE: If desired, add a tiny disclaimer under the subscribe form linking to /consent
// (Example JSX snippet to include below the form submit button):
// <p className="text-xs text-neutral-500 mt-1">By subscribing, you agree to our <a className="