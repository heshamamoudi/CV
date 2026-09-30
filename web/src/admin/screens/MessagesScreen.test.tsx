import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MessagesScreen } from './MessagesScreen';
import { setAdminLang } from '../useAdminLang';

const first: Message = {
  id: 'm-1', name: 'Ada Example', email: 'ada@example.com', subject: 'A question',
  body: 'Hello <script>bad()</script>\nSecond line', lang: 'en', status: 'new', receivedAt: '2026-09-29T10:30:00Z',
};
type Message = { id: string; name: string; email: string; subject: string; body: string; lang: string; status: 'new'|'read'|'archived'; receivedAt: string };
function page(items: Message[], total = items.length, unread = 1, p = 1) {
  return { items, total, unread, page: p, pageSize: 20 };
}
function response(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function mount() { return render(<MessagesScreen />); }

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setAdminLang('en');
  document.documentElement.dir = '';
});

describe('admin inbox', () => {
  it('loads newest messages, marks read only on explicit selection, and renders body as text', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/admin/messages?')) return response(page([first]));
      if (url === '/api/admin/messages/m-1' && init?.method === 'PATCH') return response(null, 204);
      return response({}, 404);
    });
    globalThis.fetch = fetcher as unknown as typeof fetch;
    mount();

    expect(await screen.findByRole('button', { name: /Ada Example/ })).toBeInTheDocument();
    expect(fetcher.mock.calls[0][0]).toContain('page=1');
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Ada Example/ }));
    expect(await screen.findByText(/Hello <script>bad\(\)<\/script>/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ status: 'read' });
    expect(screen.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', expect.stringContaining('mailto:ada%40example.com'));
  });

  it('submits a search and changes status filters, resetting to the first page', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (url: string) => { urls.push(url); return response(page([] , 0, 0)); }) as unknown as typeof fetch;
    mount();
    await screen.findByText('No messages match this view.');
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(urls.some(url => url.includes('q=Ada'))).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    await waitFor(() => expect(urls.some(url => url.includes('status=archived') && url.includes('page=1'))).toBe(true));
  });

  it('paginates and retries a failed load', async () => {
    let failures = 1;
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (url: string) => {
      urls.push(url);
      if (failures-- > 0) return response({ title: 'Unavailable' }, 503);
      const p = Number(new URL(url, 'https://local').searchParams.get('page'));
      return response(page([{ ...first, id: `m-${p}` }], 21, 1, p));
    }) as unknown as typeof fetch;
    mount();
    expect(await screen.findByText('Messages could not be loaded.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /Ada Example/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(urls.some(url => url.includes('page=2'))).toBe(true));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('confirms deletion with sender and subject and surfaces mutation failures', async () => {
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/admin/messages?')) return response(page([{ ...first, status: 'read' }]));
      if (init?.method === 'PATCH') return response({ title: 'No' }, 500);
      if (init?.method === 'DELETE') return response({ title: 'No' }, 500);
      return response({}, 404);
    }) as unknown as typeof fetch;
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Ada Example/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark new' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That change could not be saved. Try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('group')).toHaveTextContent('Ada Example');
    expect(screen.getByRole('group')).toHaveTextContent('A question');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That change could not be saved. Try again.');
  });
});
