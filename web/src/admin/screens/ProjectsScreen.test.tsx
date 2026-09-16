import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProjectsScreen } from './ProjectsScreen';
import { setAdminLang } from '../useAdminLang';
import type { ProjectItem } from '../types';

const safety: ProjectItem = {
  id: 3,
  sortOrder: 0,
  slug: 'safety-management-system',
  title: { en: 'Safety Management System', ar: 'نظام إدارة السلامة' },
  summary: { en: 'Incidents, audits and corrective actions.', ar: 'الحوادث والتدقيق والإجراءات التصحيحية.' },
  body: { en: 'A long story.', ar: 'قصة طويلة.' },
  technologies: ['ASP.NET Core', 'PostgreSQL'],
  featured: true,
  visible: true,
  coverMediaId: null,
};

const kiosk: ProjectItem = {
  id: 7,
  sortOrder: 1,
  slug: 'visitor-kiosk',
  title: { en: 'Visitor Kiosk', ar: 'كشك الزوار' },
  summary: { en: 'Badges at the gate.', ar: 'بطاقات عند البوابة.' },
  body: { en: '', ar: '' },
  technologies: [],
  featured: false,
  visible: false,
  coverMediaId: null,
};

interface Call {
  url: string;
  method: string;
  body: unknown;
}

const calls: Call[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const problem = (errors: Record<string, string[]>) =>
  json({ title: 'One or more validation errors occurred.', status: 400, errors }, 400);

/**
 * The admin API, answered from this file. `custom` gets first refusal on every
 * call so a test can make one endpoint fail without restating the rest.
 */
function serve(list: ProjectItem[] = [safety, kiosk], custom: (call: Call) => Response | undefined = () => undefined) {
  calls.length = 0;
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const call: Call = { url, method, body };
    calls.push(call);

    const made = custom(call);
    if (made) return made;
    if (method === 'GET' && url === '/api/admin/projects') return json(list);
    if (method === 'PUT' && url === '/api/admin/projects/order') return new Response(null, { status: 204 });
    if (method === 'DELETE') return new Response(null, { status: 204 });
    if (method === 'PUT') return json({ ...(body as object), id: Number(url.split('/').pop()), sortOrder: 0 });
    if (method === 'POST') return json({ ...(body as object), id: 99, sortOrder: list.length }, 201);
    return json({ title: 'Not found' }, 404);
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

const show = (path = '/admin/projects') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProjectsScreen />
    </MemoryRouter>,
  );

/** Opens the editor for one project from the list. */
async function open(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Edit: ${name}` }));
}

const sent = (method: string, url?: string) => calls.filter(c => c.method === method && (url === undefined || c.url === url));

afterEach(() => {
  // Unmount before the interface language goes back to English: a live screen
  // would otherwise re-render on that change, outside anything React is watching.
  cleanup();
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
  document.documentElement.dir = '';
});

describe('the projects list', () => {
  it('shows the address and the state of every project', async () => {
    serve();
    show();

    expect(await screen.findByText('safety-management-system')).toBeInTheDocument();
    expect(screen.getByText('visitor-kiosk')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('sends every id when a project moves', async () => {
    serve();
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'Move down: Safety Management System' }));

    await waitFor(() => expect(sent('PUT', '/api/admin/projects/order')).toHaveLength(1));
    expect(sent('PUT', '/api/admin/projects/order')[0].body).toEqual([7, 3]);
  });

  it('puts the old order back, and says so, when the new one is refused', async () => {
    serve([safety, kiosk], call =>
      call.url === '/api/admin/projects/order' ? problem({ ids: ['must list every item exactly once'] }) : undefined,
    );
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'Move down: Safety Management System' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/old order is back.*must list every item exactly once/i);
    // Back where it started: the first project can no longer move up.
    expect(screen.getByRole('button', { name: 'Move up: Safety Management System' })).toBeDisabled();
  });
});

describe('editing one project', () => {
  it('opens the project named in the address bar', async () => {
    serve();
    show('/admin/projects?id=7');

    expect(await screen.findByLabelText('Address')).toHaveValue('visitor-kiosk');
  });

  it('keeps the typed address and shows the server’s reason under it', async () => {
    serve([safety, kiosk], call =>
      call.method === 'PUT' && call.url === '/api/admin/projects/3'
        ? problem({ slug: ['already used by another project'] })
        : undefined,
    );
    show();
    await open('Safety Management System');

    const slug = screen.getByLabelText('Address');
    fireEvent.change(slug, { target: { value: 'visitor-kiosk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('already used by another project')).toBeInTheDocument();
    expect(slug).toHaveValue('visitor-kiosk');
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(slug).toHaveAccessibleDescription(/already used by another project/);
  });

  it('carries technologies in and back out as a list of names', async () => {
    serve();
    show();
    await open('Safety Management System');

    expect(screen.getByRole('button', { name: 'Remove ASP.NET Core' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove PostgreSQL' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove PostgreSQL' }));
    const box = screen.getByLabelText('Add a technology');
    fireEvent.change(box, { target: { value: '  React  ' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(box).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('PUT', '/api/admin/projects/3')).toHaveLength(1));
    expect((sent('PUT', '/api/admin/projects/3')[0].body as { technologies: string[] }).technologies).toEqual([
      'ASP.NET Core',
      'React',
    ]);
  });

  it('refuses a thirty-first technology in words, without dropping it silently', async () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `Tech ${i + 1}`);
    serve([{ ...safety, technologies: thirty }, kiosk]);
    show();
    await open('Safety Management System');

    const box = screen.getByLabelText('Add a technology');
    fireEvent.change(box, { target: { value: 'One too many' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent(/at most 30/i);
    expect(screen.queryByRole('button', { name: 'Remove One too many' })).not.toBeInTheDocument();
    // Still in the box, so it can be shortened or a chip removed first.
    expect(box).toHaveValue('One too many');
  });

  it('refuses a name longer than forty characters', async () => {
    serve();
    show();
    await open('Safety Management System');

    const box = screen.getByLabelText('Add a technology');
    fireEvent.change(box, { target: { value: 'x'.repeat(41) } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent(/40 characters/i);
    expect(screen.getByText('ASP.NET Core')).toBeInTheDocument();
  });

  it('says only one project can be featured, and which one loses the mark', async () => {
    serve();
    show();
    await open('Visitor Kiosk');

    expect(screen.queryByText(/only one project/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Featured'));

    const note = screen.getByText(/only one project/i);
    expect(note).toHaveTextContent(/Safety Management System/);
    expect(screen.getByLabelText('Featured')).toHaveAccessibleDescription(/only one project/i);
  });

  it('asks before deleting, naming the project', async () => {
    serve();
    show();
    await open('Visitor Kiosk');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(sent('DELETE')).toHaveLength(0);
    expect(screen.getByText('Delete the project “Visitor Kiosk”?')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => expect(screen.queryByText('visitor-kiosk')).not.toBeInTheDocument());
    expect(sent('DELETE', '/api/admin/projects/7')).toHaveLength(1);
  });

  it('creates a project the server has never seen', async () => {
    serve([]);
    show();

    fireEvent.click(await screen.findByRole('button', { name: 'New project' }));
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'new-thing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('POST', '/api/admin/projects')).toHaveLength(1));
    expect(sent('POST', '/api/admin/projects')[0].body).toMatchObject({ slug: 'new-thing', technologies: [], visible: true });
    // No title yet, so the list calls it by its address.
    expect(await screen.findByRole('button', { name: 'Edit: new-thing' })).toBeInTheDocument();
  });

  it('shows a failure that belongs to no field in the save bar', async () => {
    serve([safety, kiosk], call => (call.method === 'PUT' && call.url.endsWith('/3') ? json({ title: 'Gateway timed out' }, 502) : undefined));
    show();
    await open('Safety Management System');

    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Gateway timed out')).toBeInTheDocument();
  });

  it('speaks Arabic when the interface does', async () => {
    serve();
    setAdminLang('ar');
    show();

    expect(await screen.findByRole('button', { name: 'مشروع جديد' })).toBeInTheDocument();
  });
});
