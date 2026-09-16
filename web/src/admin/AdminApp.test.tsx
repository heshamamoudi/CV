import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminApp from './AdminApp';
import { setAdminLang } from './useAdminLang';

function route(path: string, body: unknown, status = 200) {
  return { path, body, status };
}

/** Answers the admin API from a small table; anything unlisted is a 404. */
function serve(...routes: { path: string; body: unknown; status: number }[]) {
  const stub = vi.fn(async (url: string) => {
    const match = routes.find(r => url.startsWith(r.path));
    if (!match) return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(match.body), { status: match.status, headers: { 'Content-Type': 'application/json' } });
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

function show(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminApp />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setAdminLang('en');
  localStorage.clear();
  document.documentElement.dir = '';
});

describe('the admin app', () => {
  it('shows who is signed in and the way around', async () => {
    serve(route('/api/admin/me', { email: 'owner@example.com' }), route('/api/admin/completeness', []));

    show();

    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Journey' })).toHaveAttribute('href', '/admin/journey');
    expect(screen.getByRole('link', { name: 'Media' })).toHaveAttribute('href', '/admin/media');
  });

  it('says the session expired instead of going blank', async () => {
    serve(route('/api/admin/me', { error: 'not signed in' }, 401), route('/api/admin/completeness', { error: 'not signed in' }, 401));

    show();

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in again/i);
  });

  it('switches the interface to Arabic and remembers it', async () => {
    serve(route('/api/admin/me', { email: 'owner@example.com' }), route('/api/admin/completeness', []));

    const first = show();
    fireEvent.click(await screen.findByRole('button', { name: 'العربية' }));

    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(screen.getByRole('link', { name: 'المسيرة' })).toBeInTheDocument();

    first.unmount();
    show();
    expect(await screen.findByRole('link', { name: 'المسيرة' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('answers an unknown admin address without losing the way back', async () => {
    serve(route('/api/admin/me', { email: 'owner@example.com' }));

    show('/admin/nowhere');

    expect(await screen.findByText(/not a page/i)).toBeInTheDocument();
    // The header and the panel both offer the way back.
    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(1);
  });
});
