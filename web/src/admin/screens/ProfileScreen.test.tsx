import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProfileScreen } from './ProfileScreen';
import { setAdminLang } from '../useAdminLang';
import type { ProfileEdit } from '../types';

const saved: ProfileEdit = {
  name: { en: 'Hesham', ar: 'هشام' },
  headline: { en: 'Lead engineer', ar: 'مهندس أول' },
  eyebrow: { en: '', ar: '' },
  heroTitle: { en: 'Systems that hold', ar: 'أنظمة تصمد' },
  heroSubtitle: { en: '', ar: '' },
  summary: { en: 'Twelve years of it.', ar: 'اثنا عشر عاماً.' },
  location: { en: 'Jeddah', ar: 'جدة' },
  about: { en: '', ar: '' },
  quote: { en: '', ar: '' },
  email: 'owner@example.com',
  linkedInUrl: 'https://www.linkedin.com/in/example',
  gitHubUrl: '',
  heroMediaId: null,
  portraitMediaId: null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** GET answers with the stored profile; PUT answers with whatever the test wants to happen on save. */
function serve(onPut: () => Response = () => new Response(null, { status: 204 })) {
  const stub = vi.fn(async (_url: string, init?: { method?: string }) =>
    init?.method === 'PUT' ? onPut() : json(saved),
  );
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/admin/profile']}>
      <ProfileScreen />
    </MemoryRouter>,
  );
}

/** One half of a bilingual field: the fieldset's legend names it, the inner label picks the language. */
const box = (field: string, side: 'English' | 'Arabic') =>
  within(screen.getByRole('group', { name: field })).getByLabelText(side);

const saveButton = () => screen.getByRole('button', { name: 'Save' });

const lastPut = (stub: ReturnType<typeof serve>) =>
  stub.mock.calls.filter(call => (call[1] as { method?: string } | undefined)?.method === 'PUT');

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setAdminLang('en');
  localStorage.clear();
});

describe('the profile screen', () => {
  it('loads what is stored, in both languages', async () => {
    serve();

    show();

    expect(await screen.findByDisplayValue('Hesham')).toBeInTheDocument();
    expect(box('Name', 'Arabic')).toHaveValue('هشام');
    expect(box('Headline', 'Arabic')).toHaveValue('مهندس أول');
    expect(box('Summary', 'Arabic')).toHaveValue('اثنا عشر عاماً.');
    expect(screen.getByLabelText('Email')).toHaveValue('owner@example.com');
  });

  it('offers to save only once something has actually changed', async () => {
    serve();

    show();
    await screen.findByDisplayValue('Hesham');

    expect(saveButton()).toBeDisabled();

    fireEvent.change(box('Name', 'English'), { target: { value: 'Hesham A' } });

    expect(saveButton()).toBeEnabled();
  });

  it('sends exactly what is on screen, and settles as saved', async () => {
    const stub = serve();

    show();
    await screen.findByDisplayValue('Hesham');

    fireEvent.change(box('Name', 'English'), { target: { value: 'Hesham A' } });
    fireEvent.change(screen.getByLabelText('GitHub'), { target: { value: 'https://github.com/example' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(lastPut(stub)).toHaveLength(1));
    const [url, init] = lastPut(stub)[0] as [string, { method: string; body: string }];
    expect(url).toBe('/api/admin/profile');
    expect(JSON.parse(init.body)).toEqual({
      ...saved,
      name: { en: 'Hesham A', ar: 'هشام' },
      gitHubUrl: 'https://github.com/example',
    });

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("puts the server's refusal under the box it belongs to, and keeps the edit", async () => {
    serve(() =>
      json(
        {
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { 'headline.ar': ['at most 200 characters'] },
        },
        400,
      ),
    );

    show();
    await screen.findByDisplayValue('Hesham');

    fireEvent.change(box('Headline', 'Arabic'), { target: { value: 'مهندس أول جداً' } });
    fireEvent.click(saveButton());

    const arabic = box('Headline', 'Arabic');
    await waitFor(() => expect(arabic).toHaveAccessibleDescription('at most 200 characters'));
    expect(arabic).toHaveAttribute('aria-invalid', 'true');
    expect(arabic).toHaveValue('مهندس أول جداً');
    expect(box('Headline', 'English')).not.toHaveAttribute('aria-invalid');
    expect(saveButton()).toBeEnabled();
  });
});
