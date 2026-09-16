import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { JourneyScreen } from './JourneyScreen';
import { setAdminLang } from '../useAdminLang';
import type { JourneyItem, LocalizedText } from '../types';

const text = (en: string, ar: string): LocalizedText => ({ en, ar });

/** Fresh every time: a test that edits one must not leak into the next. */
const entries = (): JourneyItem[] => [
  {
    id: 3,
    sortOrder: 0,
    title: text('Lead Engineer', 'مهندس قائد'),
    organisation: text('Acme', 'أكمي'),
    summary: text('Led the team', 'قاد الفريق'),
    highlights: [text('Shipped the platform', 'أطلق المنصة')],
    startDate: '2022-01-01',
    endDate: null,
    kind: 'main',
    seniority: 5,
    visible: true,
  },
  {
    id: 7,
    sortOrder: 1,
    title: text('Systems Engineer', ''),
    organisation: text('Globex', 'غلوبكس'),
    summary: text('', ''),
    highlights: [],
    startDate: '2019-03-01',
    endDate: '2021-12-31',
    kind: 'main',
    seniority: 3,
    visible: false,
  },
  {
    id: 9,
    sortOrder: 2,
    title: text('Contractor', 'متعاقد'),
    organisation: text('Initech', 'إنيتك'),
    summary: text('', ''),
    highlights: [],
    startDate: '2017-01-01',
    endDate: '2019-01-31',
    kind: 'additional',
    seniority: 2,
    visible: true,
  },
];

interface Call {
  url: string;
  method: string;
  body: unknown;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const nothing = () => new Response(null, { status: 204 });

const invalid = (errors: Record<string, string[]>) =>
  json({ title: 'One or more validation errors occurred.', status: 400, errors }, 400);

let calls: Call[] = [];
const originalFetch = globalThis.fetch;

/** One stub, routed by what the screen asked for - so a test fails when the screen asks for the wrong thing. */
function serve(reply: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const call: Call = {
      url: String(input),
      method: init.method ?? 'GET',
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    return Promise.resolve(reply(call));
  }) as unknown as typeof fetch;
}

const sent = (method: string) => calls.find(call => call.method === method);

const titles = () => screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);

/** Lets every pending request settle and React render the result, so nothing lands outside act(). */
const settle = () => act(async () => void (await new Promise(resolve => setTimeout(resolve, 0))));

async function show(address = '/admin/journey') {
  render(
    <MemoryRouter initialEntries={[address]}>
      <JourneyScreen />
    </MemoryRouter>,
  );
  await settle();
}

const group = (name: string) => within(screen.getByRole('group', { name }));

afterEach(() => {
  // Unmount before the language goes back to English: the language is a store every
  // mounted component listens to, and changing it under a live tree is a stray render.
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
});

describe('the journey list', () => {
  it('shows every entry in its saved order, with what is missing', async () => {
    serve(() => json(entries()));
    await show();

    expect(titles()).toEqual(['Lead Engineer', 'Systems Engineer', 'Contractor']);
    expect(sent('GET')?.url).toBe('/api/admin/journey');

    const rows = screen.getAllByRole('listitem');
    expect(within(rows[1]).getByText('One language only')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Hidden')).toBeInTheDocument();
    expect(within(rows[0]).queryByText('One language only')).toBeNull();
    expect(within(rows[0]).getByText('2022-01-01 – Present')).toBeInTheDocument();
  });

  it('falls back to the other language for a title the interface language is missing', async () => {
    serve(() => json(entries()));
    setAdminLang('ar');
    await show();

    expect(titles()).toEqual(['مهندس قائد', 'Systems Engineer', 'متعاقد']);
  });

  it('sends every id in the new order when an entry moves', async () => {
    serve(call => (call.method === 'PUT' ? nothing() : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Move down: Lead Engineer' }));

    await settle();
    expect(sent('PUT')?.url).toBe('/api/admin/journey/order');
    expect(sent('PUT')?.body).toEqual([7, 3, 9]);
    expect(titles()).toEqual(['Systems Engineer', 'Lead Engineer', 'Contractor']);
  });

  it('puts the old order back, and says why, when the reorder is refused', async () => {
    serve(call => (call.method === 'PUT' ? invalid({ ids: ['must list every item exactly once'] }) : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Move down: Lead Engineer' }));

    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('must list every item exactly once');
    expect(titles()).toEqual(['Lead Engineer', 'Systems Engineer', 'Contractor']);
  });

  it('asks before deleting, naming the entry', async () => {
    serve(call => (call.method === 'DELETE' ? nothing() : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Delete: Systems Engineer' }));
    expect(sent('DELETE')).toBeUndefined();
    expect(screen.getByText('Delete the entry “Systems Engineer” for good?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await settle();
    expect(sent('DELETE')?.url).toBe('/api/admin/journey/7');
    expect(titles()).toEqual(['Lead Engineer', 'Contractor']);
  });
});

describe('the journey editor', () => {
  it('opens the entry named in the address', async () => {
    serve(() => json(entries()));
    await show('/admin/journey?id=9');

    expect(group('Title').getByLabelText('English')).toHaveValue('Contractor');
    expect(group('Title').getByLabelText('Arabic')).toHaveValue('متعاقد');
  });

  it('sends the highlights in order when one is added', async () => {
    serve(call => (call.method === 'PUT' ? json(entries()[0]) : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Lead Engineer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add highlight' }));
    fireEvent.change(group('Highlight 2').getByLabelText('English'), { target: { value: 'Cut the build in half' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await settle();
    expect(sent('PUT')?.url).toBe('/api/admin/journey/3');
    expect(sent('PUT')?.body).toEqual({
      title: { en: 'Lead Engineer', ar: 'مهندس قائد' },
      organisation: { en: 'Acme', ar: 'أكمي' },
      summary: { en: 'Led the team', ar: 'قاد الفريق' },
      highlights: [
        { en: 'Shipped the platform', ar: 'أطلق المنصة' },
        { en: 'Cut the build in half', ar: '' },
      ],
      startDate: '2022-01-01',
      endDate: null,
      kind: 'main',
      seniority: 5,
      visible: true,
    });
  });

  it("puts an indexed field error on the highlight it belongs to, and keeps the edit", async () => {
    serve(call => (call.method === 'PUT' ? invalid({ 'highlights[1].ar': ['at most 400 characters'] }) : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Lead Engineer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add highlight' }));
    fireEvent.change(group('Highlight 2').getByLabelText('English'), { target: { value: 'Cut the build in half' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await settle();
    expect(group('Highlight 2').getByLabelText('Arabic')).toHaveAttribute('aria-invalid', 'true');
    expect(group('Highlight 2').getByLabelText('Arabic')).toHaveAccessibleDescription('at most 400 characters');
    expect(group('Highlight 1').getByLabelText('Arabic')).not.toHaveAttribute('aria-invalid');
    expect(group('Highlight 2').getByLabelText('English')).toHaveValue('Cut the build in half');
  });

  it('sends an emptied end date as null, not as an empty string', async () => {
    serve(call => (call.method === 'PUT' ? json({ ...entries()[1], endDate: null }) : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Systems Engineer' }));
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await settle();
    expect(sent('PUT')?.url).toBe('/api/admin/journey/7');
    expect((sent('PUT')?.body as { endDate: unknown }).endDate).toBeNull();
  });

  it('creates a new entry and shows it in the list', async () => {
    const created: JourneyItem = {
      id: 11,
      sortOrder: 3,
      title: text('Founder', 'مؤسس'),
      organisation: text('Own studio', 'استوديو خاص'),
      summary: text('', ''),
      highlights: [],
      startDate: '2016-05-01',
      endDate: null,
      kind: 'additional',
      seniority: 4,
      visible: true,
    };
    serve(call => (call.method === 'POST' ? json(created, 201) : json(entries())));
    await show();

    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    fireEvent.change(group('Title').getByLabelText('English'), { target: { value: 'Founder' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2016-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await settle();
    expect(sent('POST')?.url).toBe('/api/admin/journey');
    expect(sent('POST')?.body).toMatchObject({ title: { en: 'Founder', ar: '' }, startDate: '2016-05-01', kind: 'main' });
    expect(screen.getByRole('heading', { level: 3, name: 'Founder' })).toBeInTheDocument();
    expect(group('Title').getByLabelText('Arabic')).toHaveValue('مؤسس');
  });
});
