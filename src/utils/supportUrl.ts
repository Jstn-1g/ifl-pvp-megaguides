const SUPPORT_HOSTS = new Set(['buy.stripe.com', 'donate.stripe.com']);

/**
 * Accept only live, Stripe-hosted payment links. Invalid or missing values fail
 * closed so the site never renders an unreviewed payment destination.
 */
export function normalizeSupportUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const url = new URL(value.trim());
    const hasTestPath = url.pathname
      .split('/')
      .some((part) => part.toLowerCase().startsWith('test_'));

    if (
      url.protocol !== 'https:'
      || !SUPPORT_HOSTS.has(url.hostname)
      || url.port !== ''
      || url.username !== ''
      || url.password !== ''
      || url.hash !== ''
      || hasTestPath
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}
