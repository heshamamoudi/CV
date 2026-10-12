import { useEffect } from 'react';

type ConsentChoice = 'accepted' | 'rejected' | null;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __portfolioGaId?: string;
    __portfolioGaPage?: string;
  }
}

function startTag(id: string) {
  if (window.__portfolioGaId === id) return;
  window.__portfolioGaId = id;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => window.dataLayer!.push(args);
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('config', id, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.portfolioAnalytics = id;
  document.head.appendChild(script);
}

/** Loads GA only after opt-in, then sends virtual pageviews for actual routes (not home chapter hashes). */
export function GoogleAnalytics({ consent, pathname }: { consent: ConsentChoice; pathname: string }) {
  useEffect(() => {
    const id = document.querySelector<HTMLMetaElement>('meta[name="ga-measurement-id"]')?.content;
    if (!id || consent !== 'accepted') {
      if (consent !== 'accepted') {
        window.__portfolioGaPage = undefined;
        if (window.__portfolioGaId && window.gtag)
          window.gtag('consent', 'update', { analytics_storage: 'denied' });
      }
      return;
    }

    startTag(id);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const page = `${window.location.origin}${pathname}`;
      if (window.__portfolioGaPage === page) return;
      const referrer = window.__portfolioGaPage ?? document.referrer;
      window.__portfolioGaPage = page;
      window.gtag?.('event', 'page_view', {
        page_title: document.title,
        page_location: page,
        page_path: pathname,
        ...(referrer ? { page_referrer: referrer } : {}),
      });
    });
    return () => { active = false; };
  }, [consent, pathname]);

  return null;
}
