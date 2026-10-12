import { useEffect } from 'react';

type ConsentChoice = 'accepted' | 'rejected' | null;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __portfolioGaId?: string;
    __portfolioGaPage?: string;
    __portfolioGaPageLocation?: string;
    __portfolioGaSection?: string;
    __portfolioAnalyticsEnabled?: boolean;
  }
}

function initializeTagQueue(id: string) {
  if (window.__portfolioGaId === id) return false;
  window.__portfolioGaId = id;
  window.dataLayer = window.dataLayer ?? [];
  // Match Google's documented queue shape exactly. gtag.js consumes the
  // arguments object pushed by the official snippet, not a spread array.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments as unknown as unknown[]);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  return true;
}

function loadTagScript(id: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.portfolioAnalytics = id;
  document.head.appendChild(script);
}

/** Send a purpose-built event only after the visitor has accepted analytics. */
export function trackAnalyticsEvent(name: string, parameters: Record<string, string | number | boolean>) {
  if (!window.__portfolioAnalyticsEnabled || !window.gtag) return;
  window.gtag('event', name, parameters);
}

const HOME_SECTIONS = ['intro', 'work', 'journey', 'about', 'contact'] as const;

/** Loads GA only after opt-in, then tracks routes and home-section navigation. */
export function GoogleAnalytics({ consent, pathname, hash = '' }: { consent: ConsentChoice; pathname: string; hash?: string }) {
  useEffect(() => {
    const id = document.querySelector<HTMLMetaElement>('meta[name="ga-measurement-id"]')?.content;
    if (!id || consent !== 'accepted') {
      if (consent !== 'accepted') {
        window.__portfolioAnalyticsEnabled = false;
        window.__portfolioGaPage = undefined;
        window.__portfolioGaPageLocation = undefined;
        window.__portfolioGaSection = undefined;
        if (window.__portfolioGaId && window.gtag)
          window.gtag('consent', 'update', { analytics_storage: 'denied' });
      }
      return;
    }

    const isNewTag = initializeTagQueue(id);
    // Grant on every acceptance, including after a prior rejection in this tab.
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    window.__portfolioAnalyticsEnabled = true;
    if (isNewTag) {
      window.gtag?.('config', id, { send_page_view: false });
      loadTagScript(id);
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const language = pathname.split('/')[1] === 'ar' ? 'ar' : 'en';
      const safeUrl = new URL(`${window.location.origin}${pathname}`);
      const currentUrl = new URL(window.location.href);
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'dclid', 'gbraid', 'wbraid']) {
        const value = currentUrl.searchParams.get(key);
        if (value) safeUrl.searchParams.set(key, value);
      }
      const page = safeUrl.toString();
      const pathnameChanged = window.__portfolioGaPage !== pathname;
      if (pathnameChanged) window.__portfolioGaSection = undefined;
      if (pathnameChanged) {
        const referrer = window.__portfolioGaPageLocation ?? document.referrer;
        window.__portfolioGaPage = pathname;
        window.__portfolioGaPageLocation = page;
        window.gtag?.('event', 'page_view', {
          page_title: document.title,
          page_location: page,
          page_path: pathname,
          site_language: language,
          ...(referrer ? { page_referrer: referrer } : {}),
        });
        const projectSlug = pathname.match(new RegExp(`^/${language}/projects/([^/]+)/?$`))?.[1];
        if (projectSlug) window.gtag?.('event', 'project_navigation', { project_id: projectSlug, site_language: language });
      }

      if (new RegExp(`^/${language}/?$`).test(pathname)) {
        const requested = hash.replace(/^#/, '');
        const section = HOME_SECTIONS.includes(requested as typeof HOME_SECTIONS[number]) ? requested : 'intro';
        const sectionKey = `${pathname}#${section}`;
        if (window.__portfolioGaSection !== sectionKey) {
          window.__portfolioGaSection = sectionKey;
          window.gtag?.('event', 'section_navigation', { section_name: section, site_language: language });
        }
      }
    });
    return () => { active = false; };
  }, [consent, pathname, hash]);

  return null;
}
