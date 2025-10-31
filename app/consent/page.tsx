// =========================================
// NEW: app/consent/page.tsx — SMS Proof of Consent page
// =========================================
export default function ConsentPage() {
return (
<div className="prose max-w-2xl mx-auto">
<h1>SMS Consent Disclosure</h1>
<p>
By subscribing on <strong>The Deal Navigator</strong>, you agree to receive daily text
messages with curated product deals and discounts. Message frequency: 1 message per day.
Message and data rates may apply. Reply <strong>STOP</strong> to unsubscribe or <strong>HELP</strong> for help.
</p>
<h2>How to Opt In</h2>
<ol>
<li>Visit <a href="/">thedealnavigator.com</a> and open the subscription form.</li>
<li>Select <em>Delivery Preference</em> = <strong>SMS</strong> (or <strong>Both</strong>).</li>
<li>Enter your mobile number in E.164 format (e.g., <code>+17205551234</code>).</li>
<li>Submit the form to confirm your opt-in.</li>
</ol>
<p>
You can also unsubscribe at any time by replying <strong>STOP</strong>. For assistance, reply <strong>HELP</strong> or
contact us at <a href="mailto:support@thedealnavigator.com">support@thedealnavigator.com</a>.
</p>
<h2>Sample Messages</h2>
<pre>{`The Deal Navigator: Today’s Top Deals are live! Save 45% on Bose headphones + more hot finds. See all deals: https://thedealnavigator.com
Reply STOP to unsubscribe or HELP for help.`}</pre>
<pre>{`Welcome to The Deal Navigator alerts! You’ll get 1 message daily with our best deals. Msg&data rates may apply.
Reply STOP to unsubscribe or HELP for help.`}</pre>
<h2>Policies</h2>
<ul>
<li><a href="/privacy">Privacy Policy</a></li>
<li><a href="/terms">Terms of Service</a></li>
</ul>
<p className="text-sm text-neutral-600">Last updated: {new Date().toLocaleDateString()}</p>
</div>
);
}