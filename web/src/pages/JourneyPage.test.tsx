import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import type { HomeData } from '../types';
import { JourneyExplorer } from '../components/JourneyExplorer';
import { JourneyPage } from './JourneyPage';

vi.mock('../components/ArchiveFrame', () => ({ ArchiveFrame: ({ children, selectedJourneyIndex }: { children: ReactNode; selectedJourneyIndex: number }) => <div data-testid="frame" data-role-index={selectedJourneyIndex}>{children}</div> }));

it('previews repeated-year and additional roles on hover/focus, and pins on click', async () => {
  const journey: HomeData['journey'] = [
    { id: 1, title: 'Main role', organisation: 'Company A', summary: 'Main summary', highlights: ['Main result'], start: '2024-09', end: null, kind: 'main', seniority: 4 },
    { id: 2, title: 'Additional role', organisation: 'Company B', summary: 'Additional summary', highlights: ['Additional result'], start: '2024-04', end: '2024-07', kind: 'additional', seniority: 3 },
  ];
  const home = { lang: 'en', journey, profile: { name: 'Person' } } as HomeData;
  render(<MemoryRouter initialEntries={['/en/journey']}><JourneyPage home={home} /></MemoryRouter>);
  const additional = screen.getByRole('button', { name: /2024 Additional role/ });
  fireEvent.mouseEnter(additional);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument());
  expect(screen.getByText('Additional result')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('frame')).toHaveAttribute('data-role-index', '1'));
  fireEvent.mouseLeave(additional);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Main role' })).toBeInTheDocument());
  fireEvent.focus(additional);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument());
  fireEvent.click(additional);
  fireEvent.blur(additional);
  expect(additional).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument());
});

it('clears a delayed preview when the explorer unmounts', async () => {
  const journey: HomeData['journey'] = [
    { id: 1, title: 'Main role', organisation: 'Company A', summary: '', highlights: [], start: '2025-07', end: null, kind: 'main', seniority: 4 },
    { id: 2, title: 'Additional role', organisation: 'Company B', summary: '', highlights: [], start: '2024-04', end: '2024-07', kind: 'additional', seniority: 3 },
  ];
  const onActive = vi.fn();
  vi.useFakeTimers();
  try {
    const { unmount } = render(<MemoryRouter><JourneyExplorer journey={journey} lang="en" onActive={onActive} /></MemoryRouter>);
    fireEvent.mouseEnter(screen.getByRole('button', { name: /2024 Additional role/ }));
    unmount();
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(onActive).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
