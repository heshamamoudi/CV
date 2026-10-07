import { pageTitle, updatePageHead } from './title';
import strings from './i18n/strings.json';
import type { HomeData, ProjectDto } from './types';

const home = {
  profile: { name: 'Hesham', headline: 'Software Engineer', summary: 'Profile summary', heroImage: { src: '/media/hero.webp' } },
  siteTitle: 'Site name',
} as HomeData;
const project = { title: 'Platform', summary: 'Project summary', slug: 'platform', availableInOtherLanguage: false, cover: { src: '/media/project.webp' } } as ProjectDto;

describe('pageTitle', () => {
  it('uses the route title and localized labels', () => {
    expect(pageTitle('home', 'en', home, null)).toBe('Hesham, Software Engineer');
    expect(pageTitle('journey', 'ar', home, null)).toBe(`${strings.ar['page.journey']}: Hesham`);
    expect(pageTitle('projects', 'en', home, null)).toBe('Projects: Hesham');
    expect(pageTitle('project', 'en', home, project)).toBe('Platform: Hesham');
    expect(pageTitle('notfound', 'ar', home, null)).toBe(`${strings.ar['notFound.title']}: Hesham`);
  });

  it('uses available defaults when fields are missing', () => {
    expect(pageTitle('home', 'en', null, null)).toBe('Hesham Amoudi');
    expect(pageTitle('project', 'en', home, null)).toBe(`${strings.en['notFound.title']}: Hesham`);
  });
});

describe('updatePageHead', () => {
  beforeEach(() => {
    document.head.innerHTML = '<title>Old</title><link rel="canonical" href="https://test.example/en"><meta name="description" content="old"><meta property="og:title" content="old"><meta property="og:image" content="old"><meta name="twitter:image" content="old">';
    window.history.replaceState({}, '', '/en/journey');
  });

  it('refreshes canonical, language alternates, social metadata, and image without duplicating tags', () => {
    updatePageHead('journey', 'en', home, null, '/en/journey');
    updatePageHead('journey', 'en', home, null, '/en/journey');
    expect(document.title).toBe('Journey: Hesham');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://test.example/en/journey');
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="ar"]')?.href).toBe('https://test.example/ar/journey');
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="x-default"]')?.href).toBe('https://test.example/en/journey');
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe('Profile summary');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe('https://test.example/en/journey');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toBe('https://test.example/media/hero.webp');
    expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(3);
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
  });

  it('uses project cover and removes a missing project twin; notfound clears indexable metadata', () => {
    updatePageHead('project', 'en', home, project, '/en/projects/platform');
    expect(document.head.querySelector('link[hreflang="ar"]')).toBeNull();
    expect(document.head.querySelector<HTMLLinkElement>('link[hreflang="x-default"]')?.href).toBe('https://test.example/en/projects/platform');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toBe('https://test.example/media/project.webp');
    updatePageHead('notfound', 'en', home, null, '/en/missing');
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('noindex');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.head.querySelector('meta[name="twitter:image"]')).toBeNull();
  });

  it('uses a same-route server page image, then falls back to the brand card when content images are absent', () => {
    document.head.innerHTML = '<title>Old</title><link rel="canonical" href="https://test.example/en"><meta property="og:url" content="https://test.example/en/journey"><meta property="og:image" content="https://test.example/media/custom-share.webp">';
    const withoutImages = { ...home, profile: { ...home.profile, heroImage: null } } as HomeData;
    updatePageHead('journey', 'en', withoutImages, null, '/en/journey');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toBe('https://test.example/media/custom-share.webp');

    document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content = 'https://test.example/en/previous';
    updatePageHead('journey', 'en', withoutImages, null, '/en/journey');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toBe('https://test.example/brand/og-card.png');
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content).toBe('https://test.example/brand/og-card.png');
    updatePageHead('journey', 'ar', withoutImages, null, '/ar/journey');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toBe('https://test.example/brand/og-card-ar.png');
  });

  it('preserves a custom SSR home title during hydration and uses route defaults after navigation', () => {
    document.head.innerHTML = '<title>Hesham Amoudi</title><link rel="canonical" href="https://test.example/en"><meta name="description" content="Custom home capability copy"><meta property="og:url" content="https://test.example/en"><meta property="og:title" content="Hesham Amoudi"><meta property="og:description" content="Custom home capability copy">';
    updatePageHead('home', 'en', home, null, '/en');
    expect(document.title).toBe('Hesham Amoudi');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content).toBe('Hesham Amoudi');
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe('Custom home capability copy');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content).toBe('Custom home capability copy');

    updatePageHead('journey', 'en', home, null, '/en/journey');
    expect(document.title).toBe(pageTitle('journey', 'en', home, null));
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content).toBe(pageTitle('journey', 'en', home, null));
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe('Profile summary');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content).toBe('Profile summary');
  });
});
