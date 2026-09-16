import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminApp from './AdminApp';
import { setAdminLang } from './useAdminLang';

/** One plausible answer for every admin endpoint, so a whole screen can be mounted for real. */
const answers: [RegExp, unknown][] = [
  [/\/api\/admin\/me$/, { email: 'owner@example.com' }],
  [/\/api\/admin\/completeness$/, [{ area: 'journey', id: '1', label: 'Lead Application Development', missing: ['title.ar'] }]],
  [
    /\/api\/admin\/profile$/,
    {
      name: { en: 'Hesham Amoudi', ar: 'هشام العمودي' },
      headline: { en: 'Lead Application Development', ar: 'قائد تطوير التطبيقات' },
      eyebrow: { en: 'Enterprise applications', ar: 'تطبيقات المؤسسات' },
      heroTitle: { en: 'Technology that builds', ar: 'تقنية تبني' },
      heroSubtitle: { en: 'Secure and scalable', ar: 'آمنة وقابلة للتوسع' },
      summary: { en: 'Seven years', ar: 'سبع سنوات' },
      location: { en: 'Riyadh', ar: 'الرياض' },
      about: { en: 'About me', ar: 'عني' },
      quote: { en: 'Better systems.', ar: 'أنظمة أفضل.' },
      email: 'owner@example.com',
      linkedInUrl: 'https://www.linkedin.com/in/x',
      gitHubUrl: 'https://github.com/x',
      heroMediaId: null,
      portraitMediaId: null,
    },
  ],
  [
    /\/api\/admin\/journey$/,
    [
      {
        id: 1, sortOrder: 0,
        title: { en: 'Lead Application Development', ar: '' },
        organisation: { en: 'ALTANFEETHI', ar: 'التنفيذي' },
        summary: { en: '', ar: '' },
        highlights: [{ en: 'Led teams', ar: 'قيادة الفرق' }],
        startDate: '2025-07-01', endDate: null, kind: 'main', seniority: 5, visible: true,
      },
    ],
  ],
  [
    /\/api\/admin\/projects$/,
    [
      {
        id: 3, sortOrder: 0, slug: 'safety-management-system',
        title: { en: 'Safety Management System', ar: 'نظام إدارة السلامة' },
        summary: { en: 'A system', ar: 'نظام' }, body: { en: '', ar: '' },
        technologies: ['C#'], featured: true, visible: true, coverMediaId: null,
      },
    ],
  ],
  [/\/api\/admin\/technologies$/, [{ id: 1, sortOrder: 0, name: 'C#', category: { en: 'Languages', ar: 'لغات' } }]],
  [/\/api\/admin\/certificates$/, [{ id: 1, sortOrder: 0, title: { en: 'Odoo', ar: 'أودو' }, issuer: 'Odoo', issuedOn: '2022-01-01' }]],
  [/\/api\/admin\/education$/, [{ id: 1, sortOrder: 0, degree: { en: 'BSc IT', ar: 'بكالوريوس' }, institution: { en: 'KAU', ar: 'جامعة' } }]],
  [/\/api\/admin\/languages$/, [{ id: 1, sortOrder: 0, name: { en: 'Arabic', ar: 'العربية' }, level: { en: 'Native', ar: 'الأم' } }]],
  [
    /\/api\/admin\/media$/,
    [{ id: '7c9e6679742540de944be07dc4f6f2a1', fileName: 'hero.webp', width: 1920, height: 1080, alt: { en: 'Riyadh', ar: 'الرياض' }, widths: [640, 1280], previewUrl: '/media/7c9e6679742540de944be07dc4f6f2a1/640.webp', createdAt: '2026-09-16T00:00:00Z' }],
  ],
  [/\/api\/admin\/cv$/, [{ lang: 'en', fileName: 'cv.pdf', size: 120000, uploadedAt: '2026-09-16T00:00:00Z' }]],
  [
    /\/api\/admin\/seo$/,
    {
      pages: [
        { key: 'home', title: { en: '', ar: '' }, description: { en: '', ar: '' }, shareMediaId: null },
        { key: 'journey', title: { en: '', ar: '' }, description: { en: '', ar: '' }, shareMediaId: null },
        { key: 'projects', title: { en: '', ar: '' }, description: { en: '', ar: '' }, shareMediaId: null },
      ],
      settings: { gaMeasurementId: '', gaPropertyId: '', searchConsoleToken: '', notificationEmail: '', messageRetentionDays: 180 },
    },
  ],
];

function serveEverything() {
  const stub = vi.fn(async (url: string) => {
    const match = answers.find(([pattern]) => pattern.test(url));
    const body = match ? match[1] : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

afterEach(() => {
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
});

describe('every admin screen inside the real shell', () => {
  it.each([
    ['/admin', 'Dashboard', /Lead Application Development/],
    ['/admin/profile', 'Profile', /هشام العمودي/],
    ['/admin/journey', 'Journey', /ALTANFEETHI/],
    ['/admin/projects', 'Projects', /safety-management-system/],
    ['/admin/lists', 'Lists', /C#/],
    ['/admin/media', 'Media', /hero\.webp/],
    ['/admin/cv', 'CV', /cv\.pdf/],
    ['/admin/seo', 'SEO', /180/],
  ])('%s shows what the server sent, with nothing broken', async (path, nav, content) => {
    serveEverything();

    render(
      <MemoryRouter initialEntries={[path]}>
        <AdminApp />
      </MemoryRouter>,
    );

    // The shell is there, this screen is the current page, its own data is on
    // screen, and nothing anywhere said it failed.
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: nav })).toHaveAttribute('aria-current', 'page');
    await waitFor(() =>
      expect(screen.queryAllByText(content).length + screen.queryAllByDisplayValue(content).length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(screen.queryByText(/Loading…/)).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be loaded|Something went wrong|sign in again/i)).not.toBeInTheDocument();
  });

  it('shows every screen in Arabic without falling back to English labels', async () => {
    serveEverything();
    setAdminLang('ar');

    render(
      <MemoryRouter initialEntries={['/admin/journey']}>
        <AdminApp />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'المسيرة' })).toHaveAttribute('aria-current', 'page');
    expect(document.documentElement.dir).toBe('rtl');
    // The screen speaks Arabic too, not just the shell around it.
    expect(screen.getByRole('main').textContent ?? '').toMatch(/[\u0600-\u06FF]/);
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
  });
});
