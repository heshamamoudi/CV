import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useHome } from './data';
import type { HomeData } from './types';

function HomeHeadline() {
  const home = useHome('en');
  return <p>{home?.profile.headline ?? 'Loading'}</p>;
}

const home = (headline: string) => ({ profile: { headline } }) as HomeData;

afterEach(() => {
  vi.restoreAllMocks();
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
});
