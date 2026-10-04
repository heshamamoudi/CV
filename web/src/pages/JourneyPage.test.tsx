import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import type { HomeData } from '../types';
import { JourneyExplorer } from '../components/JourneyExplorer';
import { JourneyPage } from './JourneyPage';

vi.mock('../components/ArchiveFrame', () => ({ ArchiveFrame: ({ children, selectedJourneyIndex }: { children: ReactNode; selectedJourneyIndex: number }) => <div data-testid="frame" data-role-index={selectedJourneyIndex}>{children}</div> }));

it('changes the selected role on click only, with keyboard activation supported by the button', async () => {
  const journey: HomeData['journey'] = [
    { id: 1, title: 'Main role', organisation: 'Company A', summary: 'Main summary', highlights: ['Main result'], start: '2024-09', end: null, kind: 'main', seniority: 4 },
    { id: 2, title: 'Additional role', organisation: 'Company B', summary: 'Additional summary', highlights: ['Additional result'], start: '2024-04', end: '2024-07', kind: 'additional', seniority: 3 },
  ];
  const home = { lang: 'en', journey, profile: { name: 'Person' } } as HomeData;
  render(<MemoryRouter initialEntries={['/en/journey']}><JourneyPage home={home} /></MemoryRouter>);
  const additional = screen.getByRole('button', { name: /2024 Additional role/ });
  fireEvent.mouseEnter(additional);
  expect(screen.getByRole('heading', { name: 'Main role' })).toBeInTheDocument();
  expect(screen.getByTestId('frame')).toHaveAttribute('data-role-index', '0');
  fireEvent.focus(additional);
  expect(screen.getByRole('heading', { name: 'Main role' })).toBeInTheDocument();
  fireEvent.click(additional);
  expect(additional).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument());
  expect(screen.getByText('Additional result')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('frame')).toHaveAttribute('data-role-index', '1'));
  fireEvent.mouseLeave(additional);
  expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument();
});

it('keeps the selected role stable when pointer leaves the list', async () => {
  const journey: HomeData['journey'] = [
    { id: 1, title: 'Main role', organisation: 'Company A', summary: '', highlights: [], start: '2025-07', end: null, kind: 'main', seniority: 4 },
    { id: 2, title: 'Additional role', organisation: 'Company B', summary: '', highlights: [], start: '2024-04', end: '2024-07', kind: 'additional', seniority: 3 },
  ];
  render(<MemoryRouter><JourneyExplorer journey={journey} lang="en" onActive={vi.fn()} /></MemoryRouter>);
  const additional = screen.getByRole('button', { name: /2024 Additional role/ });
  fireEvent.click(additional);
  fireEvent.mouseLeave(additional);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Additional role' })).toBeInTheDocument());
});

it('lists career stations from latest to oldest and numbers them in that order', () => {
  const journey: HomeData['journey'] = [
    { id: 1, title: 'Latest role', organisation: 'Company A', summary: '', highlights: [], start: '2025-07', end: null, kind: 'main', seniority: 4 },
    { id: 2, title: 'Previous role', organisation: 'Company B', summary: '', highlights: [], start: '2024-04', end: '2025-06', kind: 'main', seniority: 3 },
    { id: 3, title: 'Earlier role', organisation: 'Company C', summary: '', highlights: [], start: '2021-01', end: '2024-03', kind: 'main', seniority: 2 },
  ];
  const { container } = render(<MemoryRouter><JourneyExplorer journey={journey} lang="en" onActive={vi.fn()} /></MemoryRouter>);
  const roles = [...container.querySelectorAll<HTMLButtonElement>('.journey-role')];
  expect(roles.map(role => role.getAttribute('aria-label'))).toEqual([
    '2025 Latest role Company A',
    '2024 Previous role Company B',
    '2021 Earlier role Company C',
  ]);
  expect(roles.map(role => role.querySelector('.journey-station-number')?.textContent)).toEqual(['01', '02', '03']);
});
