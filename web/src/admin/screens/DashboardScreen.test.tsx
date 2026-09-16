import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DashboardScreen } from './DashboardScreen';
import { setAdminLang } from '../useAdminLang';
import type { CompletenessItem } from '../types';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Answers `/api/admin/me` the same way every time; the completeness answer is what each test varies. */
function serve(completeness: () => Response) {
  const stub = vi.fn(async (url: string) =>
    url.startsWith('/api/admin/me') ? json({ email: 'owner@example.com' }) : completeness(),
  );
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <DashboardScreen />
    </MemoryRouter>,
  );
}

const calls = (stub: ReturnType<typeof serve>, path: string) =>
  stub.mock.calls.filter(call => String(call[0]).startsWith(path)).length;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setAdminLang('en');
  localStorage.clear();
});

describe('the dashboard', () => {
  it('says so plainly when nothing is half-translated', async () => {
    serve(() => json([]));

    show();

    expect(await screen.findByText(/both languages/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Journey' })).not.toBeInTheDocument();
  });

  it('groups what is missing by area, in plain words, and links to the screen that fixes it', async () => {
    const items: CompletenessItem[] = [
      { area: 'profile', id: null, label: 'Profile', missing: ['headline.ar'] },
      { area: 'journey', id: '3', label: 'Rawabi Holding', missing: ['title.ar', 'highlights[1].en'] },
      { area: 'languages', id: '9', label: 'Arabic', missing: ['level.en'] },
    ];
    serve(() => json(items));

    show();

    const entry = await screen.findByRole('link', { name: 'Rawabi Holding' });
    expect(entry).toHaveAttribute('href', '/admin/journey?id=3');
    expect(screen.getByRole('heading', { name: 'Journey' })).toBeInTheDocument();
    expect(screen.getByText('Arabic title, English highlight 2')).toBeInTheDocument();
    expect(screen.getByText('Arabic headline')).toBeInTheDocument();
    // A list row has no id of its own on the lists screen, so the tab is what the link opens.
    expect(screen.getByRole('link', { name: 'Arabic' })).toHaveAttribute('href', '/admin/lists?list=languages');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/admin/profile');
  });

  it('says the missing halves in Arabic when the interface is Arabic', async () => {
    serve(() => json([{ area: 'journey', id: '3', label: 'Rawabi Holding', missing: ['highlights[1].en'] }]));
    setAdminLang('ar');

    show();

    expect(await screen.findByText('النقطة 2 بالإنجليزية')).toBeInTheDocument();
  });

  it('offers a way back after a failed load, and asks again', async () => {
    let fail = true;
    const stub = serve(() => (fail ? json({ title: 'Database is away' }, 503) : json([])));

    show();

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is away');
    expect(calls(stub, '/api/admin/completeness')).toBe(1);

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(/both languages/i)).toBeInTheDocument();
    await waitFor(() => expect(calls(stub, '/api/admin/completeness')).toBe(2));
  });

  it('shows who is signed in and the way to each public site', async () => {
    serve(() => json([]));

    show();

    expect(await screen.findByText(/owner@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'English site' })).toHaveAttribute('href', '/en');
    expect(screen.getByRole('link', { name: 'Arabic site' })).toHaveAttribute('href', '/ar');
  });
});
