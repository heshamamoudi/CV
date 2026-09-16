import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { ListsScreen } from './ListsScreen';
import { setAdminLang } from '../useAdminLang';
import type { CertificateItem, TechnologyItem } from '../types';

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const noContent = () => new Response(null, { status: 204 });

const problem = (errors: Record<string, string[]>) =>
  json({ title: 'One or more validation errors occurred.', status: 400, errors }, 400);

/** Records every request and answers it; anything unlisted is a loud 500. */
function serve(reply: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const sent = init?.body;
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof sent === 'string' ? JSON.parse(sent) : undefined,
    };
    calls.push(call);
    return reply(call);
  }) as unknown as typeof fetch;
}

const certificates: CertificateItem[] = [
  { id: 5, sortOrder: 0, title: { en: 'Cloud Practitioner', ar: 'ممارس السحابة' }, issuer: 'AWS', issuedOn: '2023-05-01' },
  { id: 6, sortOrder: 1, title: { en: 'Scrum Master', ar: 'سكرم ماستر' }, issuer: 'Scrum.org', issuedOn: '2022-02-10' },
];

const technologies: TechnologyItem[] = [{ id: 1, sortOrder: 0, name: 'C#', category: { en: 'Backend', ar: 'خلفية' } }];

/** The four lists as they are stored; every test starts from these. */
function loads(call: Call): Response {
  if (call.method !== 'GET') return json({ title: `nothing stubbed for ${call.method} ${call.url}` }, 500);
  if (call.url === '/api/admin/certificates') return json(certificates);
  if (call.url === '/api/admin/technologies') return json(technologies);
  if (call.url === '/api/admin/education') return json([]);
  if (call.url === '/api/admin/languages') return json([]);
  return json({ title: `nothing stubbed for ${call.url}` }, 500);
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function show(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ListsScreen />
      <Where />
    </MemoryRouter>,
  );
}

const rows = () => screen.getAllByRole('listitem');

afterEach(() => {
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
  calls = [];
});

describe('the lists screen', () => {
  it('opens the list the address names, and asks for no other', async () => {
    serve(loads);

    show('/admin/lists?list=certificates');

    expect(await screen.findByDisplayValue('Cloud Practitioner')).toBeInTheDocument();
    expect(calls.map(call => call.url)).toEqual(['/api/admin/certificates']);
  });

  it('switches to another list and says so in the address', async () => {
    serve(loads);
    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    fireEvent.click(screen.getByRole('link', { name: 'Technologies' }));

    expect(await screen.findByDisplayValue('C#')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/lists?list=technologies');
    expect(calls.map(call => call.url)).toEqual(['/api/admin/certificates', '/api/admin/technologies']);
  });

  it('adds an entry and shows it among the rest', async () => {
    const created: CertificateItem = {
      id: 7,
      sortOrder: 2,
      title: { en: 'Solutions Architect', ar: 'مهندس حلول' },
      issuer: 'AWS',
      issuedOn: '2024-01-15',
    };
    serve(call => (call.method === 'POST' && call.url === '/api/admin/certificates' ? json(created, 201) : loads(call)));

    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const draft = screen.getByRole('region', { name: 'New entry' });
    fireEvent.change(within(draft).getByLabelText('English'), { target: { value: 'Solutions Architect' } });
    fireEvent.change(within(draft).getByLabelText('Issued by'), { target: { value: 'AWS' } });
    fireEvent.change(within(draft).getByLabelText('Issued on'), { target: { value: '2024-01-15' } });
    fireEvent.click(within(draft).getByRole('button', { name: 'Save' }));

    expect(await screen.findByDisplayValue('مهندس حلول')).toBeInTheDocument();
    const post = calls.find(call => call.method === 'POST');
    expect(post?.url).toBe('/api/admin/certificates');
    expect(post?.body).toEqual({ title: { en: 'Solutions Architect', ar: '' }, issuer: 'AWS', issuedOn: '2024-01-15' });
    // It joined the ordered list, not just the page.
    expect(screen.getByRole('button', { name: 'Move up: Solutions Architect' })).toBeInTheDocument();
  });

  it("puts the server's refusal on the entry that caused it", async () => {
    serve(call =>
      call.method === 'PUT' && call.url === '/api/admin/certificates/6'
        ? problem({ 'title.en': ['at most 200 characters'] })
        : loads(call),
    );

    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    const [first, second] = rows();
    fireEvent.change(within(second).getByLabelText('English'), { target: { value: 'Scrum Master II' } });
    fireEvent.click(within(second).getByRole('button', { name: 'Save' }));

    expect(await within(second).findByRole('alert')).toHaveTextContent('at most 200 characters');
    expect(within(first).queryByRole('alert')).toBeNull();
    // The refusal must not cost the owner the edit.
    expect(within(second).getByLabelText('English')).toHaveValue('Scrum Master II');
  });

  it('sends the whole new order, every id, when an entry moves', async () => {
    serve(call => (call.url === '/api/admin/certificates/order' ? noContent() : loads(call)));

    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    fireEvent.click(screen.getByRole('button', { name: 'Move down: Cloud Practitioner' }));

    await waitFor(() => expect(calls.some(call => call.url.endsWith('/order'))).toBe(true));
    const order = calls.find(call => call.url.endsWith('/order'));
    expect(order?.method).toBe('PUT');
    expect(order?.body).toEqual([6, 5]);
  });

  it('puts the order back, and says why, when the server refuses it', async () => {
    serve(call =>
      call.url === '/api/admin/certificates/order' ? problem({ ids: ['must list every item exactly once'] }) : loads(call),
    );

    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    fireEvent.click(screen.getByRole('button', { name: 'Move down: Cloud Practitioner' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/back the way it was/i);
    expect(within(rows()[0]).getByLabelText('English')).toHaveValue('Cloud Practitioner');
  });

  it('asks before deleting, and names what would go', async () => {
    serve(call => (call.method === 'DELETE' ? noContent() : loads(call)));

    show('/admin/lists?list=certificates');
    await screen.findByDisplayValue('Cloud Practitioner');

    const row = rows()[0];
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    expect(calls.some(call => call.method === 'DELETE')).toBe(false);
    expect(within(row).getByText('Delete “Cloud Practitioner” for good?')).toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByDisplayValue('Cloud Practitioner')).toBeNull());
    expect(calls.find(call => call.method === 'DELETE')?.url).toBe('/api/admin/certificates/5');
  });

  it('saves one technology to its own address', async () => {
    const saved: TechnologyItem = { id: 1, sortOrder: 0, name: 'C# 12', category: { en: 'Backend', ar: 'خلفية' } };
    serve(call => (call.method === 'PUT' && call.url === '/api/admin/technologies/1' ? json(saved) : loads(call)));

    show('/admin/lists?list=technologies');
    await screen.findByDisplayValue('C#');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'C# 12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const put = calls.find(call => call.method === 'PUT');
    expect(put?.url).toBe('/api/admin/technologies/1');
    expect(put?.body).toEqual({ name: 'C# 12', category: { en: 'Backend', ar: 'خلفية' } });
  });

  it('falls back to the first list when the address asks for one that is not there', async () => {
    serve(loads);

    show('/admin/lists?list=nonsense');

    expect(await screen.findByDisplayValue('C#')).toBeInTheDocument();
    expect(calls.map(call => call.url)).toEqual(['/api/admin/technologies']);
  });
});
