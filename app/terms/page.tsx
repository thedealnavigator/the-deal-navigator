// =========================================
// NEW: app/terms/page.tsx — stub (linkable for verification)
// =========================================
export function metadata() { return { title: 'Terms of Service — The Deal Navigator' }; }
export default function TermsPage() {
return (
<div className="prose max-w-2xl mx-auto">
<h1>Terms of Service</h1>
<p>By using The Deal Navigator, you agree to receive the content you opted into via email or SMS.</p>
<p>All deals and prices are subject to change and availability by the respective merchants.</p>
<p>Contact: <a href="mailto:support@thedealnavigator.com">support@thedealnavigator.com</a></p>
</div>
);
}