import { useEffect } from 'react';
import strings from './i18n/strings.json';
import type { HomeData, Lang, PageData, ProjectDto } from './types';

type PublicKind = Exclude<PageData['kind'], 'admin'>;
const label = (lang: Lang, key: 'page.journey' | 'page.projects' | 'notFound.title') => strings[lang][key];

/** Keep client navigation titles aligned with the server-rendered route titles. */
export function pageTitle(kind: PublicKind, lang: Lang, home: HomeData | null, project: ProjectDto | null): string {
  const name = home?.profile.name || home?.siteTitle || 'Hesham Amoudi';
  switch (kind) {
    case 'home': return home ? `${name}, ${home.profile.headline}` : name;
    case 'journey': return `${label(lang, 'page.journey')}: ${name}`;
    case 'projects': return `${label(lang, 'page.projects')}: ${name}`;
    case 'project': return `${project?.title || label(lang, 'notFound.title')}: ${name}`;
    default: return `${label(lang, 'notFound.title')}: ${name}`;
  }
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, value: string | null) {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (value === null || value === '') { existing?.remove(); return; }
  const tag = existing ?? document.createElement('meta');
  tag.setAttribute(attr, key);
  tag.content = value;
  if (!existing) document.head.append(tag);
}

function upsertLink(rel: string, href: string | null, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  if (href === null) { existing?.remove(); return; }
  const tag = existing ?? document.createElement('link');
  tag.rel = rel;
  if (hreflang) tag.hreflang = hreflang;
  tag.href = href;
  if (!existing) document.head.append(tag);
}

/** Updates the route-owned metadata after React navigation, preserving SSR for direct requests. */
export function updatePageHead(kind: PublicKind, lang: Lang, home: HomeData | null, project: ProjectDto | null, path = window.location.pathname) {
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const origin = canonical ? new URL(canonical.href, window.location.origin).origin : window.location.origin;
  const absolute = (p: string) => new URL(p, origin).href;
  const canonicalUrl = absolute(path);
  const serverPageMatches = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content === canonicalUrl;
  const title = serverPageMatches ? document.title : pageTitle(kind, lang, home, project);
  document.title = title;
  const defaultDescription = kind === 'project' ? project?.summary : kind === 'notfound' ? '' : home?.profile.summary;
  const description = serverPageMatches
    ? document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || defaultDescription
    : defaultDescription;
  const ogDescription = serverPageMatches
    ? document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content || description
    : description;
  const serverPageImage = serverPageMatches
    ? document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
    : null;
  const image = serverPageImage || project?.cover?.src || home?.profile.heroImage?.src || `/brand/og-card${lang === 'ar' ? '-ar' : ''}.png`;

  upsertMeta('meta[name="description"]', 'name', 'description', description || null);
  upsertMeta('meta[name="robots"]', 'name', 'robots', kind === 'notfound' ? 'noindex' : null);
  if (kind === 'notfound') {
    upsertLink('canonical', null);
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node => node.remove());
    for (const key of ['og:title', 'og:description', 'og:url', 'og:locale', 'og:locale:alternate', 'og:image'])
      upsertMeta(`meta[property="${key}"]`, 'property', key, null);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', null);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', null);
    return;
  }

  const twinExists = kind !== 'project' || project?.availableInOtherLanguage === true;
  const twinPath = `/${lang === 'en' ? 'ar' : 'en'}${path.slice(3)}`;
  upsertLink('canonical', canonicalUrl);
  upsertLink('alternate', canonicalUrl, lang);
  upsertLink('alternate', twinExists ? absolute(twinPath) : null, lang === 'en' ? 'ar' : 'en');
  upsertLink('alternate', lang === 'en' || twinExists ? absolute(lang === 'en' ? path : twinPath) : null, 'x-default');
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription || '');
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'ar' ? 'ar_SA' : 'en_US');
  upsertMeta('meta[property="og:locale:alternate"]', 'property', 'og:locale:alternate', lang === 'ar' ? 'en_US' : 'ar_SA');
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', image ? absolute(image) : null);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image ? absolute(image) : null);
}

export function usePageTitle(kind: PublicKind, lang: Lang, home: HomeData | null, project: ProjectDto | null = null, path?: string) {
  useEffect(() => { updatePageHead(kind, lang, home, project, path); }, [kind, lang, home, project, path]);
}
