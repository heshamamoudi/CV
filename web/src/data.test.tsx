import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useHome, useProject } from './data';
import type { HomeData, Lang, ProjectDto } from './types';

function HomeHeadline({ label = 'page', lang = 'en' }: { label?: string; lang?: Lang }) {
  const home = useHome(lang);
  return <p data-label={label}>{home?.profile.headline ?? 'Loading'}</p>;
}

const home = (headline: string) => ({ profile: { headline } }) as HomeData;
function ProjectTitle({ slug }: { slug: string }) {
  const project = useProject('en', slug);
  return <p>{project?.title ?? (project === null ? 'Not found' : 'Loading')}</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('public content freshness', () => {
  it('refreshes the cached page when a visitor returns to the tab', async () => {
    let version = home('Loaded from the page');
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(version), { status: 200 }));
    globalThis.fetch = fetcher as unknown as typeof fetch;

    render(<HomeHeadline />);
    expect(await screen.findByText('Loaded from the page')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);

    version = home('Updated in the admin');
    act(() => { fireEvent.focus(window); });

    expect(await screen.findByText('Updated in the admin')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/public/en/home');
  });

  it('ignores an earlier project response after navigation to another slug', async () => {
    let resolveEarlier: ((response: Response) => void) | undefined;
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/earlier')) return new Promise<Response>(resolve => { resolveEarlier = resolve; });
      return Promise.resolve(new Response(JSON.stringify({ slug: 'current', title: 'Current project' } satisfies Partial<ProjectDto>), { status: 200 }));
    });
    globalThis.fetch = fetcher as unknown as typeof fetch;
    const view = render(<ProjectTitle slug="earlier" />);

    view.rerender(<ProjectTitle slug="current" />);
    expect(await screen.findByText('Current project')).toBeInTheDocument();

    await act(async () => {
      resolveEarlier?.(new Response(JSON.stringify({ slug: 'earlier', title: 'Stale project' }), { status: 200 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Current project')).toBeInTheDocument();
    expect(screen.queryByText('Stale project')).not.toBeInTheDocument();
  });

  it('updates every mounted consumer when simultaneous requests share a cache key', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ slug: 'simultaneous', title: 'Loaded simultaneously' }), { status: 200 })) as unknown as typeof fetch;

    render(<><ProjectTitle slug="simultaneous" /><ProjectTitle slug="simultaneous" /></>);

    expect(await screen.findAllByText('Loaded simultaneously')).toHaveLength(2);
  });

  it('accepts a live request when a newer consumer unmounts before its request completes', async () => {
    const resolutions: Array<(response: Response) => void> = [];
    const signals: AbortSignal[] = [];
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise<Response>(resolve => resolutions.push(resolve));
    }) as unknown as typeof fetch;
    const view = render(<><ProjectTitle slug="unmount-race" /><ProjectTitle slug="unmount-race" /></>);
    expect(resolutions).toHaveLength(2);

    view.rerender(<ProjectTitle slug="unmount-race" />);
    expect(signals[1]?.aborted).toBe(true);
    await act(async () => {
      resolutions[0]?.(new Response(JSON.stringify({ slug: 'unmount-race', title: 'Surviving request' }), { status: 200 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Surviving request')).toBeInTheDocument();

    await act(async () => {
      resolutions[1]?.(new Response(JSON.stringify({ slug: 'unmount-race', title: 'Aborted request' }), { status: 200 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText('Aborted request')).not.toBeInTheDocument();
  });

  it('synchronizes secondary consumers when another consumer refreshes the shared cache', async () => {
    vi.useFakeTimers();
    let version = home('Initial Arabic');
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(version), { status: 200 })) as unknown as typeof fetch;
    const view = render(<HomeHeadline lang="ar" label="page" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText('Initial Arabic')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    view.rerender(<><HomeHeadline lang="ar" label="page" /><HomeHeadline lang="ar" label="archive" /></>);
    expect(screen.getAllByText('Initial Arabic')).toHaveLength(2);

    version = home('Updated Arabic');
    await act(async () => { await vi.advanceTimersByTimeAsync(29_000); });
    expect(screen.getAllByText('Updated Arabic')).toHaveLength(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(screen.getAllByText('Updated Arabic')).toHaveLength(2);

    version = home('Focused refresh');
    await act(async () => {
      fireEvent.focus(window);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getAllByText('Focused refresh')).toHaveLength(2);
  });

  it('keeps a 404 result when the visitor revisits that slug before the cache expires', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    globalThis.fetch = fetcher as unknown as typeof fetch;
    const first = render(<ProjectTitle slug="never-published" />);
    expect(await screen.findByText('Not found')).toBeInTheDocument();
    first.unmount();

    render(<ProjectTitle slug="never-published" />);
    expect(screen.getByText('Not found')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
