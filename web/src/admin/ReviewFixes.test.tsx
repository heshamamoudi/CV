import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { JourneyScreen } from './screens/JourneyScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { MediaScreen } from './screens/MediaScreen';
import { setAdminLang } from './useAdminLang';

/** What the pre-deploy review found: edits that vanished without a word. */

const journeyEntries = [
  {
    id: 1, sortOrder: 0,
    title: { en: 'Lead Application Development', ar: 'قائد تطوير التطبيقات' },
    organisation: { en: 'ALTANFEETHI', ar: 'التنفيذي' },
    summary: { en: '', ar: '' },
    highlights: [{ en: 'Led teams', ar: 'قيادة الفرق' }],
    startDate: '2025-07-01', endDate: null, kind: 'main', seniority: 5, visible: true,
  },
  {
    id: 2, sortOrder: 1,
    title: { en: 'Business Application Senior Specialist', ar: 'أخصائي أول' },
    organisation: { en: 'Jeddah Airports', ar: 'مطارات جدة' },
    summary: { en: '', ar: '' },
    highlights: [],
    startDate: '2024-09-01', endDate: '2025-07-01', kind: 'main', seniority: 4, visible: true,
  },
];

const projects = [
  {
    id: 3, sortOrder: 0, slug: 'safety-management-system',
    title: { en: 'Safety Management System', ar: 'نظام إدارة السلامة' },
    summary: { en: 'A system', ar: 'نظام' }, body: { en: '', ar: '' },
    technologies: ['C#'], featured: true, visible: true, coverMediaId: null,
  },
  {
    id: 4, sortOrder: 1, slug: 'airport-process-automation',
    title: { en: 'Airport process automation', ar: 'أتمتة إجراءات المطار' },
    summary: { en: 'Automation', ar: 'أتمتة' }, body: { en: '', ar: '' },
    technologies: [], featured: false, visible: true, coverMediaId: null,
  },
];

const media = [
  {
    id: '7c9e6679742540de944be07dc4f6f2a1', fileName: 'hero.webp', width: 1920, height: 1080,
    alt: { en: 'Riyadh', ar: '' }, widths: [640, 1280],
    previewUrl: '/media/7c9e6679742540de944be07dc4f6f2a1/640.webp', createdAt: '2026-09-16T00:00:00Z',
  },
];

function serve(body: unknown) {
  const stub = vi.fn(async (_url: string, init?: { method?: string }) =>
    init?.method && init.method !== 'GET'
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

function show(ui: React.ReactElement, path = '/admin') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

afterEach(() => {
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
});

describe('switching to another item while editing', () => {
  it('asks first on the journey, and keeps the edit when the answer is no', async () => {
    serve(journeyEntries);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    show(<JourneyScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Lead Application Development' }));
    const english = screen.getAllByLabelText('English')[0];
    fireEvent.change(english, { target: { value: 'Head of Engineering' } });

    fireEvent.click(screen.getByRole('button', { name: 'Business Application Senior Specialist' }));

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Head of Engineering')).toBeInTheDocument();
  });

  it('asks first on projects, and moves on when the answer is yes', async () => {
    serve(projects);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    show(<ProjectsScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit: Safety Management System' }));
    fireEvent.change(await screen.findByDisplayValue('safety-management-system'), { target: { value: 'sms' } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit: Airport process automation' }));

    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByDisplayValue('airport-process-automation')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('sms')).not.toBeInTheDocument();
  });

  it('does not ask when nothing was changed', async () => {
    serve(projects);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    show(<ProjectsScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit: Safety Management System' }));
    await screen.findByDisplayValue('safety-management-system');
    fireEvent.click(screen.getByRole('button', { name: 'Edit: Airport process automation' }));

    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('a dashboard link that opens one project', () => {
  it('does not reclaim the editor after the list changes', async () => {
    serve(projects);
    show(<ProjectsScreen />, '/admin/projects?id=3');

    // Arrived on project 3, then went to project 4 and edited it.
    await screen.findByDisplayValue('safety-management-system');
    fireEvent.click(screen.getByRole('button', { name: 'Edit: Airport process automation' }));
    const slug = await screen.findByDisplayValue('airport-process-automation');
    fireEvent.change(slug, { target: { value: 'airport-automation' } });

    // Anything that reloads or reorders the list used to snap back to project 3.
    fireEvent.click(screen.getAllByRole('button', { name: /Move up/ })[1]);

    await waitFor(() => expect(screen.getByDisplayValue('airport-automation')).toBeInTheDocument());
  });
});

describe('alt text typed but not saved', () => {
  it('is worth a warning before the window closes', async () => {
    serve(media);
    const add = vi.spyOn(window, 'addEventListener');
    show(<MediaScreen />);

    const arabic = await screen.findByLabelText(/Arabic/);
    fireEvent.change(arabic, { target: { value: 'الرياض عند الغروب' } });

    await waitFor(() => expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function)));
  });
});
