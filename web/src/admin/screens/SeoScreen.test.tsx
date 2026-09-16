import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SeoScreen } from './SeoScreen';
import { setAdminLang } from '../useAdminLang';
import type { SeoView } from '../types';

const seo: SeoView = {
  pages: [
    { key: 'home', title: { en: 'Hesham Amoudi', ar: 'هشام عمودي' }, description: { en: 'Engineer', ar: 'مهندس' }, shareMediaId: null },
    { key: 'journey', title: { en: '', ar: '' }, description: { en: '', ar: '' }, shareMediaId: null },
    { key: 'projects', title: { en: '', ar: '' }, description: { en: '', ar: '' }, shareMediaId: null },
  ],
  settings: {
    gaMeasurementId: '',
    gaPropertyId: '',
    searchConsoleToken: '',
    notificationEmail: 'owner@example.com',
    messageRetentionDays: 365,
  },
};

type Reply = { status: number; body?: unknown };

function serve(handler: (url: string, init: RequestInit) => Reply) {
  const stub = vi.fn(async (url: string, init: RequestInit = {}) => {
    const reply = handler(url, init);
    if (reply.status === 204) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

const loaded = (url: string, init: RequestInit): Reply =>
  url === '/api/admin/seo' && init.method === 'GET' ? { status: 200, body: seo } : { status: 404 };

const show = () =>
  render(
    <MemoryRouter>
      <SeoScreen />
    </MemoryRouter>,
  );

const region = (name: string) => within(screen.getByRole('region', { name }));

/** The English or Arabic box of one bilingual field inside one section. */
const box = (section: string, field: string, language: 'English' | 'Arabic') =>
  within(region(section).getByRole('group', { name: field })).getByLabelText(language);

const putTo = (fetched: ReturnType<typeof serve>, path: string) =>
  fetched.mock.calls.filter(([url, init]) => url === path && init?.method === 'PUT');

afterEach(() => {
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
});

describe('the SEO screen', () => {
  it('shows what each page currently overrides', async () => {
    serve(loaded);

    show();

    expect(await screen.findByRole('region', { name: 'Home page' })).toBeInTheDocument();
    expect(box('Home page', 'Page title', 'English')).toHaveValue('Hesham Amoudi');
    expect(box('Home page', 'Page title', 'Arabic')).toHaveValue('هشام عمودي');
    expect(box('Journey page', 'Page title', 'English')).toHaveValue('');
    expect(box('Home page', 'Page title', 'English')).toHaveAttribute('maxlength', '70');
    expect(box('Home page', 'Page description', 'English')).toHaveAttribute('maxlength', '200');
  });

  it('saves one page override to that page alone', async () => {
    const fetched = serve((url, init) => {
      if (url === '/api/admin/seo/pages/home' && init.method === 'PUT') return { status: 204 };
      return loaded(url, init);
    });

    show();
    await screen.findByRole('region', { name: 'Home page' });

    fireEvent.change(box('Home page', 'Page title', 'English'), { target: { value: 'Hesham Amoudi — software engineer' } });
    fireEvent.click(region('Home page').getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(putTo(fetched, '/api/admin/seo/pages/home')).toHaveLength(1));
    const sent = JSON.parse(String(putTo(fetched, '/api/admin/seo/pages/home')[0][1]?.body));
    expect(sent).toEqual({
      title: { en: 'Hesham Amoudi — software engineer', ar: 'هشام عمودي' },
      description: { en: 'Engineer', ar: 'مهندس' },
      shareMediaId: null,
    });
    expect(putTo(fetched, '/api/admin/seo/pages/journey')).toHaveLength(0);
    expect(putTo(fetched, '/api/admin/seo/settings')).toHaveLength(0);
    expect(await region('Home page').findByText('Saved')).toBeInTheDocument();
  });

  it('allows an override to be emptied so the page uses its own text', async () => {
    const fetched = serve((url, init) => {
      if (url === '/api/admin/seo/pages/home' && init.method === 'PUT') return { status: 204 };
      return loaded(url, init);
    });

    show();
    await screen.findByRole('region', { name: 'Home page' });

    for (const [field, language] of [
      ['Page title', 'English'],
      ['Page title', 'Arabic'],
      ['Page description', 'English'],
      ['Page description', 'Arabic'],
    ] as const) {
      fireEvent.change(box('Home page', field, language), { target: { value: '' } });
    }
    fireEvent.click(region('Home page').getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(putTo(fetched, '/api/admin/seo/pages/home')).toHaveLength(1));
    expect(JSON.parse(String(putTo(fetched, '/api/admin/seo/pages/home')[0][1]?.body))).toEqual({
      title: { en: '', ar: '' },
      description: { en: '', ar: '' },
      shareMediaId: null,
    });
  });

  it("puts the server's word on a bad measurement id under that field", async () => {
    serve((url, init) => {
      if (url === '/api/admin/seo/settings' && init.method === 'PUT')
        return {
          status: 400,
          body: {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { gaMeasurementId: ['looks like G-XXXXXXXXXX'] },
          },
        };
      return loaded(url, init);
    });

    show();
    await screen.findByRole('region', { name: 'Analytics and settings' });

    const measurement = screen.getByLabelText('Google Analytics measurement id');
    fireEvent.change(measurement, { target: { value: 'nope' } });
    fireEvent.click(region('Analytics and settings').getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(measurement).toHaveAccessibleDescription(/looks like G-XXXXXXXXXX/));
    expect(measurement).toHaveAttribute('aria-invalid', 'true');
    expect(measurement).toHaveValue('nope');
    expect(screen.getByLabelText('Google Analytics property id')).not.toHaveAttribute('aria-invalid');
  });

  it('says where each analytics value comes from', async () => {
    serve(loaded);

    show();
    await screen.findByRole('region', { name: 'Analytics and settings' });

    expect(screen.getByLabelText('Google Analytics measurement id')).toHaveAccessibleDescription(/data streams/);
    expect(screen.getByLabelText('Google Analytics property id')).toHaveAccessibleDescription(/property settings/);
    expect(screen.getByLabelText('Search Console verification token')).toHaveAccessibleDescription(/HTML tag/);
  });

  it('saves the settings panel on its own', async () => {
    const fetched = serve((url, init) => {
      if (url === '/api/admin/seo/settings' && init.method === 'PUT') return { status: 204 };
      return loaded(url, init);
    });

    show();
    await screen.findByRole('region', { name: 'Analytics and settings' });

    fireEvent.change(screen.getByLabelText('Google Analytics measurement id'), { target: { value: 'G-ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Delete messages after (days)'), { target: { value: '90' } });
    fireEvent.click(region('Analytics and settings').getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(putTo(fetched, '/api/admin/seo/settings')).toHaveLength(1));
    expect(JSON.parse(String(putTo(fetched, '/api/admin/seo/settings')[0][1]?.body))).toEqual({
      gaMeasurementId: 'G-ABCD1234',
      gaPropertyId: '',
      searchConsoleToken: '',
      notificationEmail: 'owner@example.com',
      messageRetentionDays: 90,
    });
    expect(putTo(fetched, '/api/admin/seo/pages/home')).toHaveLength(0);
  });
});
