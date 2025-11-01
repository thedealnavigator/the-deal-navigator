// lib/affiliates.ts
export function buildAffiliateUrl(opts: {
  merchant: { network?: string; program_id?: string; domain: string };
  rawUrl: string;
  clickId: string;
  channel?: 'web' | 'email' | 'sms';
}) {
  const u = new URL(opts.rawUrl);
  const { network, program_id } = opts.merchant;

  switch (network) {
    case 'impact':
      // TODO: replace YOURSUBDOMAIN/program with your actual values
      return `https://YOURSUBDOMAIN.pxf.io/c/${program_id}?subId1=${opts.clickId}&u=${encodeURIComponent(u.toString())}`;
    case 'cj':
      // TODO: adjust to your CJ click domain/pattern
      return `https://www.anrdoezrs.net/click-${program_id}?sid=${opts.clickId}&url=${encodeURIComponent(u.toString())}`;
    case 'rakuten':
      u.searchParams.set('ranMID', program_id || '');
      u.searchParams.set('ranSiteID', opts.clickId);
      return u.toString();
    case 'amazon':
      // On-site only; OK to add tag for on-site Buy buttons.
      if (process.env.AMAZON_TAG) u.searchParams.set('tag', process.env.AMAZON_TAG);
      return u.toString();
    default:
      // Fallback UTM tagging
      u.searchParams.set('utm_source', 'deal-navigator');
      u.searchParams.set('utm_medium', opts.channel || 'web');
      u.searchParams.set('utm_campaign', 'holiday-2025');
      u.searchParams.set('cid', opts.clickId);
      return u.toString();
  }
}
