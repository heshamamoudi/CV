import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import type { HomeData } from '../types';

const home: HomeData = {
  lang: 'ar',
  profile: {
    name: 'هشام العمودي', headline: 'قائد تطوير التطبيقات', eyebrow: 'e', heroTitle: 'h', heroSubtitle: 's',
    summary: 'ملخص', location: 'الرياض', about: 'نبذة', quote: 'q',
    email: 'a@b.c', linkedInUrl: 'https://l', gitHubUrl: 'https://g',
  },
  journey: [{ id: 1, title: 'قائد تطوير التطبيقات', organisation: 'شركة التنفيذي', summary: '', highlights: ['قيادة'], start: '2025-07', end: null, kind: 'main', seniority: 5 }],
  featuredProject: null,
  projects: [],
  technologies: [{ category: 'قواعد البيانات', items: ['PostgreSQL'] }],
  certificates: [], education: [], languages: [],
  updatedAt: '2026-09-15T00:00:00Z',
};

describe('HomePage', () => {
  it('renders the name as the only h1, the journey and the technologies', () => {
    render(<MemoryRouter><HomePage home={home} /></MemoryRouter>);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('هشام العمودي');
    expect(screen.getByText('شركة التنفيذي')).toBeInTheDocument();
    expect(screen.getByText(/حتى الآن/)).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });
});
